
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import mediapipe as mp
import math
import numpy as np
import time
from collections import defaultdict
import socket

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:5173"]}})  # Allow React app

# Initialize mediapipe pose class
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, model_complexity=1)
mp_drawing = mp.solutions.drawing_utils

# Store session data for timer and sets
session_data = {
    'current_pose': None,
    'start_time': None,
    'duration': 30,
    'sets': 3,
    'current_set': 1,
    'pose_history': defaultdict(list)
}

def detectPose(image, pose):
    """
    Detects pose landmarks in the input image using MediaPipe.
    """
    try:
        output_image = image.copy()
        imageRGB = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(imageRGB)
        height, width, _ = image.shape
        landmarks = []

        if results.pose_landmarks:
            mp_drawing.draw_landmarks(
                image=output_image,
                landmark_list=results.pose_landmarks,
                connections=mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                connection_drawing_spec=mp_drawing.DrawingSpec(color=(255, 255, 255), thickness=2)
            )
            for landmark in results.pose_landmarks.landmark:
                landmarks.append((int(landmark.x * width), int(landmark.y * height), landmark.z * width))

        return output_image, landmarks
    except Exception as e:
        print(f"Error in detectPose: {e}")
        return image, []

def calculateAngle(landmark1, landmark2, landmark3):
    """
    Calculates the angle between three landmarks.
    """
    try:
        x1, y1, _ = landmark1
        x2, y2, _ = landmark2
        x3, y3, _ = landmark3
        angle = math.degrees(math.atan2(y3 - y2, x3 - x2) - math.atan2(y1 - y2, x1 - x2))
        return angle + 360 if angle < 0 else angle
    except Exception as e:
        print(f"Error in calculateAngle: {e}")
        return 0

def classifyPose(landmarks, output_image):
    """
    Classifies the yoga pose based on joint angles.
    """
    label = 'Unknown Pose'
    color = (0, 0, 255)

    try:
        if not landmarks:
            cv2.putText(output_image, label, (10, 30), cv2.FONT_HERSHEY_PLAIN, 2, color, 2)
            return output_image, label

        left_elbow_angle = calculateAngle(
            landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value],
            landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value],
            landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value]
        )
        right_elbow_angle = calculateAngle(
            landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value],
            landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value],
            landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value]
        )
        left_shoulder_angle = calculateAngle(
            landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value],
            landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value],
            landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
        )
        right_shoulder_angle = calculateAngle(
            landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value],
            landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value],
            landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value]
        )
        left_knee_angle = calculateAngle(
            landmarks[mp_pose.PoseLandmark.LEFT_HIP.value],
            landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value],
            landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]
        )
        right_knee_angle = calculateAngle(
            landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value],
            landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value],
            landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]
        )
        left_hip_angle = calculateAngle(
            landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value],
            landmarks[mp_pose.PoseLandmark.LEFT_HIP.value],
            landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
        )
        right_hip_angle = calculateAngle(
            landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value],
            landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value],
            landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value]
        )

        if (165 < left_elbow_angle < 195 and 165 < right_elbow_angle < 195 and
            80 < left_shoulder_angle < 110 and 80 < right_shoulder_angle < 110 and
            ((165 < left_knee_angle < 195 and 90 < right_knee_angle < 120) or
             (165 < right_knee_angle < 195 and 90 < left_knee_angle < 120))):
            label = 'Warrior II Pose'

        elif ((165 < left_knee_angle < 195 and 25 < right_knee_angle < 45) or
              (165 < right_knee_angle < 195 and 315 < left_knee_angle < 335)):
            label = 'Tree Pose'

        elif (165 < left_knee_angle < 195 and 165 < right_knee_angle < 195 and
              130 < left_elbow_angle < 180 and 175 < right_elbow_angle < 220 and
              100 < left_shoulder_angle < 200 and 50 < right_shoulder_angle < 130):
            label = 'T Pose'

        elif (160 < left_hip_angle < 200 and 160 < right_hip_angle < 200 and
              160 < left_knee_angle < 200 and 160 < right_knee_angle < 200 and
              150 < left_elbow_angle < 190 and 150 < right_elbow_angle < 190):
            label = 'Downward Dog'

        elif (170 < left_elbow_angle < 190 and 170 < right_elbow_angle < 190 and
              170 < left_knee_angle < 190 and 170 < right_knee_angle < 190 and
              80 < left_hip_angle < 100 and 80 < right_hip_angle < 100):
            label = 'Plank'

        elif (170 < left_knee_angle < 190 and 170 < right_knee_angle < 190 and
              30 < left_hip_angle < 60 and 30 < right_hip_angle < 60 and
              160 < left_elbow_angle < 190 and 160 < right_elbow_angle < 190):
            label = 'Cobra Pose'

        if label != 'Unknown Pose':
            color = (0, 255, 0)
            session_data['current_pose'] = label
            if session_data['start_time'] is None:
                session_data['start_time'] = time.time()
            else:
                elapsed = time.time() - session_data['start_time']
                session_data['pose_history'][label].append(elapsed)
        else:
            session_data['current_pose'] = None
            session_data['start_time'] = None

        cv2.putText(output_image, label, (10, 30), cv2.FONT_HERSHEY_PLAIN, 2, color, 2)
        return output_image, label

    except Exception as e:
        print(f"Error in classifyPose: {e}")
        cv2.putText(output_image, label, (10, 30), cv2.FONT_HERSHEY_PLAIN, 2, color, 2)
        return output_image, label

def webcam_feed():
    """
    Streams webcam feed with pose detection and classification.
    """
    print("Attempting to initialize webcam...")
    camera_video = None
    for index in range(3):  # Try cameras 0, 1, 2
        camera_video = cv2.VideoCapture(index, cv2.CAP_DSHOW)  # CAP_DSHOW for Windows
        if camera_video.isOpened():
            print(f"Webcam opened successfully on index {index}")
            break
        camera_video.release()
    else:
        print("Error: No webcam found or accessible. Using placeholder image.")
        placeholder = np.zeros((640, 640, 3), dtype=np.uint8)
        cv2.putText(placeholder, "No Webcam Available", (50, 320), cv2.FONT_HERSHEY_PLAIN, 2, (255, 255, 255), 2)
        ret, jpeg = cv2.imencode('.jpg', placeholder)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        return

    camera_video.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    camera_video.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    camera_video.set(cv2.CAP_PROP_FPS, 30)

    # Verify webcam readiness
    for _ in range(10):
        ok, frame = camera_video.read()
        if ok:
            print("Webcam frame read successfully")
            break
    else:
        print("Error: Could not read frame from webcam.")
        camera_video.release()
        return

    try:
        while True:
            ok, frame = camera_video.read()
            if not ok:
                print("Warning: Failed to read frame. Reinitializing webcam...")
                camera_video.release()
                camera_video = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                if not camera_video.isOpened():
                    print("Error: Could not reopen webcam.")
                    break
                continue

            frame = cv2.flip(frame, 1)
            frame_height, frame_width, _ = frame.shape
            frame = cv2.resize(frame, (int(frame_width * (640 / frame_height)), 640))
            frame, landmarks = detectPose(frame, pose)
            if landmarks:
                frame, _ = classifyPose(landmarks, frame)

            ret, jpeg = cv2.imencode('.jpg', frame)
            if not ret:
                print("Warning: Failed to encode frame as JPEG.")
                continue

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')

    except Exception as e:
        print(f"Error in webcam_feed: {e}")
    finally:
        if camera_video:
            camera_video.release()
            print("Webcam released.")

@app.route('/video_feed')
def video_feed():
    """
    Streams the webcam feed with pose detection.
    """
    print("Serving /video_feed")
    return Response(webcam_feed(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/update_session', methods=['POST'])
def update_session():
    """
    Updates session data for duration and sets.
    """
    try:
        data = request.get_json()
        if data:
            session_data['duration'] = int(data.get('duration', session_data['duration']))
            session_data['sets'] = int(data.get('sets', session_data['sets']))
            session_data['current_set'] = int(data.get('current_set', session_data['current_set']))
            session_data['start_time'] = None

        time_spent = 0
        if session_data['current_pose'] and session_data['start_time']:
            time_spent = time.time() - session_data['start_time']

        return jsonify({
            'current_pose': session_data['current_pose'],
            'current_set': session_data['current_set'],
            'sets': session_data['sets'],
            'duration': session_data['duration'],
            'time_spent': time_spent,
            'pose_history': dict(session_data['pose_history'])
        })
    except Exception as e:
        print(f"Error in update_session: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/reset_session', methods=['POST'])
def reset_session():
    """
    Resets session data to default values.
    """
    try:
        session_data.update({
            'current_pose': None,
            'start_time': None,
            'duration': 30,
            'sets': 3,
            'current_set': 1,
            'pose_history': defaultdict(list)
        })
        return jsonify({'message': 'Session reset successfully'})
    except Exception as e:
        print(f"Error in reset_session: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health_check():
    """
    Health check endpoint to verify server status.
    """
    return jsonify({'status': 'Backend is running'}), 200

if __name__ == '__main__':
    ports = [8080]  # Try 3001, fallback to 8080
    server_started = False
    for port in ports:
        try:
            print(f"Attempting to start Flask server on port {port}...")
            app.run(debug=True, host='0.0.0.0', port=port, use_reloader=False)
            server_started = True
            break
        except socket.error as e:
            print(f"Port {port} is in use or unavailable: {e}")
            continue
    if not server_started:
        print("Error: Could not start server. All ports are in use.")
