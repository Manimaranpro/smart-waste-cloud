import { FlaskSourceFile } from '../types';

export const FLASK_PROJECT_FILES: FlaskSourceFile[] = [
  {
    path: 'app.py',
    category: 'core',
    description: 'Main Application Entry Point - Flask initialization, route registration & error handling',
    content: `"""
Smart Waste Monitoring System using Cloud Computing
Backend Framework: Python Flask
Database: MongoDB Atlas (Free Cluster)
Cloud Host: Render (Free Web Service)
"""

import os
from flask import Flask, render_template, jsonify
from flask_cors import CORS
from config import Config
from database import init_db

# Initialize Flask App
app = Flask(__name__, static_folder='static', template_folder='templates')
app.config.from_object(Config)

# Enable Cross Origin Resource Sharing for APIs
CORS(app)

# Initialize Database Connection
db = init_db(app)

# Register Blueprints / Routes
from routes.auth_routes import auth_bp
from routes.citizen_routes import citizen_bp
from routes.worker_routes import worker_bp
from routes.admin_routes import admin_bp
from routes.api_routes import api_bp

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(citizen_bp, url_prefix='/citizen')
app.register_blueprint(worker_bp, url_prefix='/worker')
app.register_blueprint(admin_bp, url_prefix='/admin')
app.register_blueprint(api_bp, url_prefix='/api/v1')

@app.route('/')
def home():
    """Landing Page Route"""
    return render_template('index.html')

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(error):
    return render_template('500.html'), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=Config.DEBUG)
`
  },
  {
    path: 'config.py',
    category: 'config',
    description: 'Environment Configuration & MongoDB Atlas URI Settings',
    content: `import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'smart_waste_cloud_secret_key_2026')
    
    # MongoDB Atlas Connection String (Free Tier M0 Cluster)
    MONGO_URI = os.getenv(
        'MONGO_URI',
        'mongodb+srv://admin:cloudpass123@cluster0.abcde.mongodb.net/smart_waste_db?retryWrites=true&w=majority'
    )
    
    # Cloudinary Cloud Storage Config (Free Tier)
    CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME', 'demo_cloud')
    CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY', '123456789')
    CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET', 'secret_key')
    
    # Session & Security
    SESSION_PERMANENT = False
    SESSION_TYPE = "filesystem"
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload limit
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() in ['true', '1']
`
  },
  {
    path: 'database.py',
    category: 'core',
    description: 'MongoDB Atlas Connection Manager & Index Creation',
    content: `from pymongo import MongoClient, ASCENDING, DESCENDING
import sys

mongo_client = None
db = None

def init_db(app):
    global mongo_client, db
    mongo_uri = app.config['MONGO_URI']
    try:
        mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db = mongo_client.get_default_database()
        print(" Successfully connected to MongoDB Atlas Cloud Cluster!")
        
        # Create Collection Indexes for Search Optimization
        create_indexes()
        return db
    except Exception as e:
        print(f" MongoDB Atlas Connection Error: {e}")
        sys.exit(1)

def create_indexes():
    """Create MongoDB indexes for faster querying and role management"""
    if db is not None:
        db.users.create_index([("email", ASCENDING)], unique=True)
        db.workers.create_index([("userId", ASCENDING)], unique=True)
        db.complaints.create_index([("ticketNo", ASCENDING)], unique=True)
        db.complaints.create_index([("status", ASCENDING)])
        db.complaints.create_index([("ward", ASCENDING)])
        db.complaints.create_index([("citizenId", ASCENDING)])
        db.complaints.create_index([("workerId", ASCENDING)])
        print(" Database Indexes verified successfully.")
`
  },
  {
    path: 'models/user_model.py',
    category: 'models',
    description: 'User Data Access Object with bcrypt password hashing',
    content: `from database import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class UserModel:
    @staticmethod
    def create_user(name, email, password, role='citizen', phone='', ward=''):
        hashed_password = generate_password_hash(password)
        user_doc = {
            "name": name,
            "email": email.lower().strip(),
            "password": hashed_password,
            "role": role,
            "phone": phone,
            "ward": ward,
            "createdAt": datetime.utcnow()
        }
        result = db.users.insert_one(user_doc)
        return str(result.inserted_id)

    @staticmethod
    def find_by_email(email):
        return db.users.find_one({"email": email.lower().strip()})

    @staticmethod
    def verify_password(stored_password_hash, provided_password):
        return check_password_hash(stored_password_hash, provided_password)
`
  },
  {
    path: 'models/complaint_model.py',
    category: 'models',
    description: 'Complaint Data Schema & Aggregation Queries',
    content: `from database import db
from datetime import datetime
from bson.objectid import ObjectId

class ComplaintModel:
    @staticmethod
    def create_complaint(data):
        doc = {
            "ticketNo": data['ticketNo'],
            "title": data['title'],
            "description": data['description'],
            "garbageType": data['garbageType'],
            "severity": data['severity'],
            "address": data['address'],
            "ward": data['ward'],
            "lat": float(data.get('lat', 0.0)),
            "lng": float(data.get('lng', 0.0)),
            "imageUrl": data['imageUrl'],
            "status": 'pending',
            "citizenId": data['citizenId'],
            "citizenName": data['citizenName'],
            "citizenPhone": data.get('citizenPhone', ''),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        result = db.complaints.insert_one(doc)
        return str(result.inserted_id)

    @staticmethod
    def get_all_complaints(query=None):
        query = query or {}
        return list(db.complaints.find(query).sort("createdAt", -1))

    @staticmethod
    def assign_worker(complaint_id, worker_id, worker_name, worker_phone):
        return db.complaints.update_one(
            {"_id": ObjectId(complaint_id)},
            {"$set": {
                "status": "assigned",
                "workerId": worker_id,
                "workerName": worker_name,
                "workerPhone": worker_phone,
                "assignedAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }}
        )

    @staticmethod
    def update_status(complaint_id, status, cleaned_image_url=None, worker_notes=None):
        update_fields = {
            "status": status,
            "updatedAt": datetime.utcnow()
        }
        if cleaned_image_url:
            update_fields["cleanedImageUrl"] = cleaned_image_url
        if worker_notes:
            update_fields["workerNotes"] = worker_notes
        if status in ['completed', 'verified']:
            update_fields["completedAt"] = datetime.utcnow()

        return db.complaints.update_one(
            {"_id": ObjectId(complaint_id)},
            {"$set": update_fields}
        )
`
  },
  {
    path: 'routes/admin_routes.py',
    category: 'routes',
    description: 'Admin Portal Routes for Analytics & Worker Assignment',
    content: `from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from models.complaint_model import ComplaintModel
from models.user_model import UserModel
from database import db

admin_bp = Blueprint('admin', __name__)

@admin_bp.before_request
def check_admin():
    if 'user_role' not in session or session['user_role'] != 'admin':
        return jsonify({"error": "Unauthorized Access"}), 403

@admin_bp.route('/dashboard')
def dashboard():
    total = db.complaints.count_documents({})
    pending = db.complaints.count_documents({"status": "pending"})
    in_progress = db.complaints.count_documents({"status": "in_progress"})
    resolved = db.complaints.count_documents({"status": {"$in": ["completed", "verified"]}})
    workers = list(db.workers.find())
    
    return render_template(
        'admin/dashboard.html',
        total=total,
        pending=pending,
        in_progress=in_progress,
        resolved=resolved,
        workers=workers
    )

@admin_bp.route('/assign-worker', methods=['POST'])
def assign_worker():
    data = request.json
    complaint_id = data.get('complaintId')
    worker_id = data.get('workerId')
    worker = db.workers.find_one({"userId": worker_id})
    
    if worker:
        ComplaintModel.assign_worker(complaint_id, worker_id, worker['name'], worker['phone'])
        return jsonify({"success": True, "message": "Worker assigned successfully"})
    return jsonify({"error": "Worker not found"}), 404
`
  },
  {
    path: 'requirements.txt',
    category: 'config',
    description: 'Python Dependencies for Render Free Tier Deployment',
    content: `Flask==3.0.0
pymongo==4.6.1
dnspython==2.4.2
python-dotenv==1.0.0
Werkzeug==3.0.1
gunicorn==21.2.0
flask-cors==4.0.0
requests==2.31.0
cloudinary==1.36.0
`
  },
  {
    path: 'README.md',
    category: 'docs',
    description: 'Complete Project Documentation & Deployment Instructions',
    content: `# Smart Waste Monitoring System using Cloud Computing

A complete, free end-to-end cloud computing project for automated municipal waste tracking, citizen complaints, municipal worker dispatch, and admin analytics dashboard.

## Tech Stack
- **Frontend**: HTML5, CSS3, Bootstrap 5, JavaScript (ES6)
- **Backend**: Python Flask 3.0
- **Database**: MongoDB Atlas M0 Free Cluster
- **Cloud Hosting**: Render Free Web Service (WSGI Gunicorn)
- **Image Storage**: Cloudinary / Base64 Local Uploads

## Free Cloud Deployment (Render + MongoDB Atlas)
1. Fork repo to GitHub
2. Create MongoDB Atlas Free M0 database and copy \`MONGO_URI\`
3. Connect repository on Render.com -> Web Service
4. Set Environment Variable: \`MONGO_URI\`
5. Deploy! Service goes live with SSL HTTPS.
`
  }
];
