import os
from databases import Database
import sqlalchemy
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/postgres")

database = Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

sessions = sqlalchemy.Table(
    "sessions",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("mode", sqlalchemy.String, nullable=False),
    sqlalchemy.Column("started_at", sqlalchemy.DateTime(timezone=True), server_default=sqlalchemy.func.now()),
    sqlalchemy.Column("ended_at", sqlalchemy.DateTime(timezone=True), nullable=True),
    sqlalchemy.Column("status", sqlalchemy.String, server_default="active"),
)

signal_events = sqlalchemy.Table(
    "signal_events",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("session_id", sqlalchemy.String, sqlalchemy.ForeignKey("sessions.id", ondelete="CASCADE")),
    sqlalchemy.Column("signal_type", sqlalchemy.String, nullable=False),
    sqlalchemy.Column("raw_payload", sqlalchemy.JSON, nullable=False),
    sqlalchemy.Column("confidence", sqlalchemy.Numeric(4, 3)),
    sqlalchemy.Column("detected_at", sqlalchemy.DateTime(timezone=True), server_default=sqlalchemy.func.now()),
)

alerts = sqlalchemy.Table(
    "alerts",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("session_id", sqlalchemy.String, sqlalchemy.ForeignKey("sessions.id", ondelete="CASCADE")),
    sqlalchemy.Column("signal_event_id", sqlalchemy.String, sqlalchemy.ForeignKey("signal_events.id")),
    sqlalchemy.Column("explanation", sqlalchemy.Text, nullable=False),
    sqlalchemy.Column("severity", sqlalchemy.String, server_default="medium"),
    sqlalchemy.Column("created_at", sqlalchemy.DateTime(timezone=True), server_default=sqlalchemy.func.now()),
)

engine = sqlalchemy.create_engine(DATABASE_URL.replace("postgresql", "postgresql+psycopg2") if "postgresql" in DATABASE_URL else DATABASE_URL)

def init_db():
    metadata.create_all(engine)
