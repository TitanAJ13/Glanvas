from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base
from alt import db
import datetime
import os

# db.Model = declarative_base()

class Link(db.Model):

    __tablename__ = "Links"

    id = Column("id", Integer, primary_key=True, autoincrement=True)
    position = Column("position", Integer, nullable=False)
    display_name = Column("display_name", String, nullable=False)
    type = Column("type", String, nullable=False)
    url = Column("url", String, nullable=False)

    def toJSON(self):
        return {
            "id":self.id,
            "position":self.position,
            "display_name": self.display_name,
            "type": self.type,
            "url" : self.url
        }
    
# "items": [
#     {
#         "type": "file | page | header | link"
#     },
#     {
#         "type": "file",
#         "display": "Handbook",
#         "url": "https://docs.google.com/file/d/1m8086GT_8HL2tLom2q6ueM_dcSTuenVZ/view"
#     },
#     {
#         "type": "page",
#         "display": "Welcome to Glee!",
#         "content": "html content"
#     },
#     {
#         "type": "header",
#         "display": "This is a subheader"
#     },
#     {
#         "type": "link",
#         "display": "Rick Roll",
#         "url": "www.youtube.com"
#     }
# ]

class Module(db.Model):
    __tablename__ = "Modules"

    id = Column("id", Integer, primary_key=True, autoincrement=True)
    position = Column("position", Integer, nullable=False)
    display_name = Column("display_name", String, nullable=False)
    hidden = Column("hidden", Boolean, nullable=False)

    def toJSON(self):
        return {
            "id": self.id,
            "position": self.position,
            "display_name": self.display_name,
            "hidden" : self.hidden
        }
    
class Item(db.Model):
    __tablename__ = "Items"

    id = Column("id", Integer, primary_key=True, autoincrement=True)
    module_id = Column("module_id", Integer, nullable=False)
    position = Column("position", Integer, nullable=False)
    type = Column("type", String, nullable=False)
    display = Column("display", String, nullable=False)
    url = Column("url", String, nullable=True)
    hidden = Column("hidden", Boolean, nullable=False)

    def toJSON(self):
        return {
            "id": self.id,
            "module_id": self.module_id,
            "position": self.position,
            "type": self.type,
            "display": self.display,
            "url": self.url,
            "hidden": self.hidden
        }
    
class Announcement(db.Model):
    __tablename__ = "Announcements"

    id = Column("id", Integer, primary_key=True, autoincrement=False)
    author = Column("author", String, nullable=False)
    title = Column("title", String, nullable=False)
    avatar = Column("avatar", String, nullable=True)
    date_posted = Column("date_posted", DateTime, nullable=False,default=datetime.datetime.now(datetime.timezone.utc))
    content = Column("content", String, nullable=False)

    def toJSON(self):
        return {
            "id": self.id,
            "author": self.author,
            "title": self.title,
            "avatar": self.avatar,
            "date_posted": self.date_posted,
            "content" : self.content
        }
    
class FileData(db.Model):
    __tablename__ = "FileData"

    key=Column("key", String, primary_key=True,nullable=False)
    url=Column("url", String, nullable=False)
    display_name=Column("display_name", String, nullable=False)

    def toJSON(self):
        return {
            "url": self.url,
            "key": self.key,
            "display_name": self.display_name
        }
    
class MusicData(db.Model):
    __tablename__ = "MusicData"

    key=Column("key", String, primary_key=True,nullable=False)
    url =Column("url", String, nullable=False)
    display_name=Column("display_name", String, nullable=False)

    def toJSON(self):
        return {
            "url": self.url,
            "key": self.key,
            "display_name": self.display_name
        }
    
class Config(db.Model):
    __tablename__ = "Config"

    key = Column("key", String, primary_key=True, nullable=False)
    value = Column("value", String, nullable=False)

    def toJSON(self):
        return {
            'key': self.key,
            'value': self.value
        }