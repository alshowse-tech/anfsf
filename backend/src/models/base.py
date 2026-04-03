"""Base Model - SQLAlchemy Base Class"""

from sqlalchemy.orm import declarative_base

Base = declarative_base()


def get_base():
    """Return the SQLAlchemy Base class"""
    return Base
