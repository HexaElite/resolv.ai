"""Seed realistic demo data for all personas."""
import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from modules.core.models import ServiceRequest, StatusEnum, PriorityEnum, CategoryEnum


SEED_REQUESTS = [
    {
        "title": "WiFi down in Lab 3 during CS final exam",
        "description": "WiFi is completely down in Lab 3 during the CS final exam. Students can't submit their online papers. This is extremely urgent.",
        "category": CategoryEnum.IT,
        "priority": PriorityEnum.CRITICAL,
        "status": StatusEnum.NEW,
        "location": "Lab 3",
        "summary": "Critical connectivity failure during active exam affecting student submissions.",
        "resolution_steps": json.dumps([
            "Notify IT admin immediately",
            "Check router/switch in Lab 3",
            "Enable backup hotspot if available",
            "Update students on ETA",
        ]),
        "assigned_to": None,
    },
    {
        "title": "Projector not working in Lecture Hall B",
        "description": "The projector in Lecture Hall B won't turn on. Lecturer can't show slides for a class starting in 10 minutes.",
        "category": CategoryEnum.FACILITIES,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.ASSIGNED,
        "location": "Lecture Hall B",
        "summary": "Projector failure blocking active lecture. Immediate facilities response needed.",
        "resolution_steps": json.dumps([
            "Check HDMI cable connection",
            "Inspect power supply and remote battery",
            "Arrange portable projector as backup",
            "Log for maintenance check",
        ]),
        "assigned_to": "Rohan Gamage",
    },
    {
        "title": "AC not working in Room 204",
        "description": "The air conditioning in Room 204 has not been working for two days. It's very uncomfortable for studying.",
        "category": CategoryEnum.FACILITIES,
        "priority": PriorityEnum.MEDIUM,
        "status": StatusEnum.IN_PROGRESS,
        "location": "Room 204",
        "summary": "HVAC failure in study room affecting student comfort for 48+ hours.",
        "resolution_steps": json.dumps([
            "Check thermostat settings",
            "Inspect AC unit filter",
            "Schedule HVAC technician visit",
            "Provide temporary fans if available",
        ]),
        "assigned_to": "HVAC Team",
    },
    {
        "title": "Main exam server not responding",
        "description": "Main exam server is not responding. Students can't submit papers. Critical during exam period.",
        "category": CategoryEnum.IT,
        "priority": PriorityEnum.CRITICAL,
        "status": StatusEnum.IN_PROGRESS,
        "location": "Server Room",
        "summary": "Main exam server outage. Staff using AI-suggested steps to resolve.",
        "resolution_steps": json.dumps([
            "SSH into server — check uptime and error logs",
            "Restart application service",
            "Verify student access restored",
            "Update ticket to COMPLETED",
        ]),
        "assigned_to": "Nimal Jayawardena",
    },
    {
        "title": "Plumbing leak in Block C washroom",
        "description": "There is a water leak in the Block C ground floor washroom. Water is spreading to the hallway.",
        "category": CategoryEnum.FACILITIES,
        "priority": PriorityEnum.HIGH,
        "status": StatusEnum.IN_PROGRESS,
        "location": "Block C",
        "summary": "Active plumbing leak causing water damage risk in Block C ground floor.",
        "resolution_steps": json.dumps([
            "Shut off water supply to affected area",
            "Place warning signs for wet floor",
            "Contact plumber for emergency repair",
            "Arrange cleanup crew",
        ]),
        "assigned_to": "Maintenance Team",
    },
    {
        "title": "Student ID card access not working",
        "description": "My student ID card isn't opening the Library entrance door. I've tried multiple times.",
        "category": CategoryEnum.SECURITY,
        "priority": PriorityEnum.MEDIUM,
        "status": StatusEnum.ASSIGNED,
        "location": "Library Entrance",
        "summary": "Student access control malfunction at Library. Card reader may need reset.",
        "resolution_steps": json.dumps([
            "Verify card is activated in system",
            "Check card reader power and connection",
            "Reset card reader if unresponsive",
            "Issue temporary access if needed",
        ]),
        "assigned_to": "Security Office",
    },
    {
        "title": "Request for new office chair",
        "description": "The office chair at desk 12 in the admin office has a broken wheel. Requesting a replacement.",
        "category": CategoryEnum.FACILITIES,
        "priority": PriorityEnum.LOW,
        "status": StatusEnum.COMPLETED,
        "location": "Admin Office - Desk 12",
        "summary": "Furniture replacement request for broken office chair.",
        "resolution_steps": json.dumps([
            "Verify chair condition on-site",
            "Check inventory for replacement chairs",
            "Deliver and swap chair",
            "Dispose of broken furniture",
        ]),
        "assigned_to": "Facilities Staff",
    },
    {
        "title": "Payroll discrepancy for March",
        "description": "My March salary seems incorrect. I worked overtime on 3 days but it's not reflected.",
        "category": CategoryEnum.HR,
        "priority": PriorityEnum.MEDIUM,
        "status": StatusEnum.NEW,
        "location": "HR Department",
        "summary": "Salary discrepancy report — overtime hours not reflected in March payroll.",
        "resolution_steps": json.dumps([
            "Verify overtime records in attendance system",
            "Cross-check with department head approval",
            "Recalculate payroll with correct hours",
            "Issue adjustment in next pay cycle",
        ]),
        "assigned_to": None,
    },
]


def seed_database(db: Session):
    """Insert seed data if the database is empty."""
    existing = db.query(ServiceRequest).count()
    if existing > 0:
        return False

    now = datetime.now(timezone.utc)
    for i, data in enumerate(SEED_REQUESTS):
        # Stagger creation times for realism
        created = now - timedelta(hours=len(SEED_REQUESTS) - i, minutes=i * 7)
        request = ServiceRequest(
            title=data["title"],
            description=data["description"],
            category=data["category"],
            priority=data["priority"],
            status=data["status"],
            location=data["location"],
            summary=data["summary"],
            resolution_steps=data["resolution_steps"],
            assigned_to=data["assigned_to"],
            created_at=created,
            updated_at=created + timedelta(minutes=i * 3),
        )
        db.add(request)

    db.commit()
    return True
