from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker, Session
from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from alt import db
from models import Link, Module, Announcement, Config, FileData, MusicData, Item
import datetime
from typing import Any, Tuple
from zoneinfo import ZoneInfo
import json
from functools import wraps

def wrap_context():
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            with getattr(self,'app').app_context():
                return func(self, *args, **kwargs)
        return wrapper
    return decorator

class MySession():
    def __init__(self, session: SQLAlchemy, app: Flask):
        self.app = app
        self.session = session.session
        self.initConfig()

    @wrap_context()
    def getLinksJSON(self) -> list[dict[str, Any]]:
        """Returns all `Link` objects in the database parsed as Python `dict` objects"""
        links = self.session.query(Link).order_by(Link.position).all()
        obj = []
        for link in links:
            obj.append(link.toJSON())
        return obj

    @wrap_context()
    def getModulesJSON(self) -> list[dict[str, Any]]:
        """Returns all `Module` objects in the database parsed as Python `dict` objects"""
        modules = self.session.query(Module).order_by(Module.position).all()
        obj = []
        for module in modules:
            obj.append(module.toJSON())
        return obj

    @wrap_context()
    def getItemsJSON(self, id) -> list[dict[str, Any]]:
        items = self.session.query(Item).filter_by(module_id=id).order_by(Item.position).all()
        obj = []
        for item in items:
            obj.append(item.toJSON())
        return obj

    @wrap_context()
    def getFilesJSON(self) -> list[dict[str, Any]]:
        files = self.session.query(FileData).order_by(FileData.display_name).all()
        obj = []
        for item in files:
            obj.append(item.toJSON())
        return obj

    @wrap_context()
    def getMusicsJSON(self) -> list[dict[str, Any]]:
        musics = self.session.query(MusicData).order_by(MusicData.display_name).all()
        obj = []
        for item in musics:
            obj.append(item.toJSON())
        return obj
    
    @wrap_context()
    def getAllItemsJSON(self) -> list[dict[str, Any]]:
        items = self.session.query(Item).order_by(Item.module_id, Item.position).all()
        obj = []
        for item in items:
            obj.append(item.toJSON())
        return obj

    @wrap_context()
    def getAnnouncementsJSON(self) -> list[dict[str, Any]]:
        announcements = self.session.query(Announcement).order_by(desc(Announcement.date_posted)).all()
        obj = []
        for announcement in announcements:
            obj.append(announcement.toJSON())
        return obj

    @wrap_context()
    def getAnnouncementsJSONSerialized(self) -> list[dict[str, Any]]:
        announcements = self.session.query(Announcement).order_by(desc(Announcement.date_posted)).all()
        obj = []
        for announcement in announcements:
            temp = announcement.toJSON()
            temp['date_posted'] = temp['date_posted'].isoformat()
            obj.append(temp)
        return obj

    @wrap_context()
    def getConfigJSON(self) -> list[dict[str, Any]]:
        configs = self.session.query(Config).all()
        obj = {}
        for config in configs:
            js = config.toJSON()
            obj[js['key']] = js['value']
        return obj

    @wrap_context()
    def initConfig(self):
        if not self.session.query(Config).filter_by(key='authorization').first():
            self.session.add(Config(key='authorization', value=''))

        if not self.session.query(Config).filter_by(key='homeAnnouncements').first():
            self.session.add(Config(key='homeAnnouncements', value='3'))

        if not self.session.query(Config).filter_by(key='calendarNum').first():
            self.session.add(Config(key='calendarNum', value='6'))

        if not self.session.query(Config).filter_by(key='calendarDelta').first():
            self.session.add(Config(key='calendarDelta', value='5'))

        if not self.session.query(Config).filter_by(key='username').first():
            self.session.add(Config(key='username', value='admin'))

        if not self.session.query(Config).filter_by(key='password').first():
            self.session.add(Config(key='password', value='password'))

        self.session.commit()

    @wrap_context()
    def getConfig(self, key):
        result = self.session.query(Config).filter_by(key=key).first()
        if not result:
            raise KeyError(f'{key} is not a valid Configuration key')

        return result.value

    @wrap_context()
    def editConfig(self, key: str, value: str):
        result = self.session.query(Config).filter_by(key=key).first()
        if not result:
            raise KeyError(f'{key} is not a valid Configuration key')

        result.value = value
        self.session.commit()

    @wrap_context()
    def editConfigAll(self, newConfig: dict):
        for key in newConfig.keys():
            result = self.session.query(Config).filter_by(key=key).first()
            if not result:
                self.session.rollback()
                raise KeyError(f'{key} is not a valid Configuration key')
            result.value = newConfig[key]

        self.session.commit()

    @wrap_context()
    def getModule(self, position) -> Module | None:
        return self.session.query(Module).filter_by(position=position).first()

    @wrap_context()
    def getModuleID(self, position) -> int:
        return self.session.query(Module).filter_by(position=position).first().id

    @wrap_context()
    def getLink(self, position) -> Link | None:
        return self.session.query(Link).filter_by(position=position).first()

    @wrap_context()
    def getFile(self, key) -> FileData | None:
        return self.session.query(FileData).filter_by(key=key).first()
    
    @wrap_context()
    def getMusic(self, key) -> MusicData | None:
        return self.session.query(MusicData).filter_by(key=key).first()

    @wrap_context()
    def getItem(self, modulePos, itemPos) -> Item | None:
        return self.session.query(Item).filter_by(module_id = self.getModuleID(modulePos), position=itemPos).first()
    
    @wrap_context()
    def getAnnouncement(self, id) -> Announcement | None:
        return self.session.query(Announcement).filter_by(id = id).first()

    @wrap_context()
    def moveLink(self, pos1, pos2):
        link1 = self.session.query(Link).filter_by(position=pos1).first()
        linkList = self.session.query(Link).order_by(Link.position).all()
        linkList.remove(link1)
        linkList.insert(pos2 - 1, link1)
        minPos = pos1 if pos1 < pos2 else pos2
        print(f"start: {minPos}; stop: {len(linkList)}")
        for i in range(minPos - 1, len(linkList)):
            linkList[i].position = i + 1
        self.session.commit()

    @wrap_context()
    def moveModule(self, pos1, pos2):
        module1 = self.session.query(Module).filter_by(position=pos1).first()
        moduleList = self.session.query(Module).order_by(Module.position).all()
        moduleList.remove(module1)
        moduleList.insert(pos2 - 1, module1)
        minPos = pos1 if pos1 < pos2 else pos2
        for i in range(minPos - 1, len(moduleList)):
            moduleList[i].position = i+1
        self.session.commit()

    @wrap_context()
    def moveItem(self, modulePos, pos1, pos2):
        item1 = self.session.query(Item).filter_by(module_id = self.getModuleID(modulePos), position=pos1).first()
        itemList = self.session.query(Item).filter_by(module_id = item1.module_id).order_by(Item.position).all()
        itemList.remove(item1)
        itemList.insert(pos2 - 1, item1)
        minPos = pos1 if pos1 < pos2 else pos2
        for i in range(minPos - 1, len(itemList)):
            itemList[i].position = i+1
        self.session.commit()

    @wrap_context()
    def addModule(self, position: int, display_name: str, hidden: bool) -> dict:
        module = Module(position = position, display_name = display_name, hidden = hidden)
        all = self.session.query(Module).order_by(Module.position).all()
        self.session.add(module)
        all.insert(module.position-1, module)
        for i in range(module.position, len(all)):
            all[i].position = i + 1
        self.session.commit()
        return module.toJSON()

    @wrap_context()
    def addLink(self, position: int, display_name: str, url: str, type: str) -> dict:
        link = Link(position = position, display_name = display_name, url = url, type=type)
        all = self.session.query(Link).order_by(Link.position).all()
        self.session.add(link)
        all.insert(link.position-1, link)
        for i in range(link.position, len(all)):
            all[i].position = i + 1
        self.session.commit()
        return link.toJSON()

    @wrap_context()
    def addItem(self, position: int, display: str, url: str, type: str, module_id: int, hidden: bool) -> dict:
        item = Item(position = position, display = display, url = url, type=type, module_id=module_id, hidden=hidden)
        all = self.session.query(Item).filter_by(module_id = item.module_id).order_by(Item.position).all()
        self.session.add(item)
        all.insert(item.position-1, item)
        for i in range(item.position, len(all)):
            all[i].position = i + 1
        self.session.commit()
        return item.toJSON()

    @wrap_context()
    def addFile(self, key: str, url: str, display_name: str) -> dict:
        file = FileData(key = key, url = url, display_name = display_name)
        self.session.add(file)
        self.session.commit()
        return file.toJSON()

    @wrap_context()
    def addMusic(self, key: str, url: str, display_name: str) -> dict:
        music = MusicData(key = key, url = url, display_name = display_name)
        self.session.add(music)
        self.session.commit()
        return music.toJSON()

    @wrap_context()
    def addAnnouncement(self, author: str, title: str, date_posted: datetime.datetime, content: str, id: int) -> dict:
        announcement = Announcement(author = author, title = title, date_posted = date_posted, content = content, id = id)
        self.session.add(announcement)
        self.session.commit()
        return announcement.toJSON()

    @wrap_context()
    def deleteModule(self, position: int):
        module = self.session.query(Module).filter_by(position=position).first()
        all = self.session.query(Module).order_by(Module.position).all()
        all.remove(module)
        for i in range(module.position - 1, len(all)):
            all[i].position = i + 1
        self.session.query(Item).filter_by(module_id=module.id).delete()
        self.session.delete(module)
        self.session.commit()

    @wrap_context()
    def deleteLink(self, position: int):
        link = self.session.query(Link).filter_by(position = position).first()
        all = self.session.query(Link).order_by(Link.position).all()
        all.remove(link)
        for i in range(link.position - 1, len(all)):
            all[i].position = i + 1
        self.session.delete(link)
        self.session.commit()

    @wrap_context()
    def deleteItem(self, modulePos: int, position: int):
        item = self.session.query(Item).filter_by(module_id = self.getModuleID(modulePos), position=position).first()
        all = self.session.query(Item).filter_by(module_id = item.module_id).order_by(Item.position).all()
        all.remove(item)
        for i in range(item.position - 1, len(all)):
            all[i].position = i + 1
        self.session.delete(item)
        self.session.commit()

    @wrap_context()
    def deleteFile(self, key: str):
        file = self.session.query(FileData).filter_by(key=key).first()
        self.session.delete(file)
        self.session.commit()

    @wrap_context()
    def deleteMusic(self, key: str):
        music = self.session.query(MusicData).filter_by(key=key).first()
        self.session.delete(music)
        self.session.commit()

    @wrap_context()
    def deleteAnnouncement(self, id: int):
        announcement = self.session.query(Announcement).filter_by(id = id).first()
        self.session.delete(announcement)
        self.session.commit()

    @wrap_context()
    def updateKeys(self, keytype, old_key, new_key):
        items = self.session.query(Item).filter_by(type = keytype, url = old_key).all()
        for item in items:
            item.url = new_key

        links = self.session.query(Link).filter_by(type = keytype, url = old_key).all()
        for link in links:
            link.url = new_key

    def saveState(self) -> dict:
        root = {}
        modules = self.getModulesJSON()
        announcements = self.getAnnouncementsJSONSerialized()
        files = self.getFilesJSON()
        links = self.getLinksJSON()
        music = self.getMusicsJSON()
        items = self.getAllItemsJSON()

        current = datetime.datetime.now().astimezone(ZoneInfo("America/New_York")).isoformat()

        root['saveDate'] = current
        root['links'] = links
        root['announcements'] = announcements
        root['modules'] = modules
        root['items'] = items
        root['files'] = files
        root['music'] = music

        return root

    @wrap_context()
    def loadState(self, jsonfile):
        try:

            jsonfile = json.load(jsonfile)

            self.session.query(Module).delete()
            self.session.query(Item).delete()
            self.session.query(Link).delete()
            self.session.query(Announcement).delete()
            self.session.query(FileData).delete()
            self.session.query(MusicData).delete()

            if ('modules' in jsonfile):
                for module in jsonfile['modules']:
                    moduleObj = Module(id = module['id'], position = module['position'], display_name = module['display_name'], hidden = module['hidden'])
                    self.session.add(moduleObj)
            if ('items' in jsonfile):
                for item in jsonfile['items']:
                    itemObj = Item(id = item['id'], module_id = item['module_id'], position = item['position'], type= item['type'], display = item['display'], url = item['url'], hidden = item['hidden'])
                    self.session.add(itemObj)
            if ('links' in jsonfile):
                for link in jsonfile['links']:
                    linkObj = Link(id = link['id'], position = link['position'], display_name = link['display_name'], type = link['type'], url = link['url'])
                    self.session.add(linkObj)
            if ('announcements' in jsonfile):
                for announcement in jsonfile['announcements']:
                    announcementObj = Announcement(id = announcement['id'], author = announcement['author'], title = announcement['title'], date_posted = datetime.datetime.fromisoformat(announcement['date_posted']), content = announcement['content'])
                    self.session.add(announcementObj)
            if ('files' in jsonfile):
                for file in jsonfile['files']:
                    fileObj = FileData(key = file['key'], url = file['url'], display_name = file['display_name'])
                    self.session.add(fileObj)
            if ('music' in jsonfile):
                for music in jsonfile['music']:
                    musicObj = MusicData(key = music['key'], url = music['url'], display_name = music['display_name'])
                    self.session.add(musicObj)
            self.session.commit()
            if 'saveDate' in jsonfile:
                date = datetime.datetime.fromisoformat(jsonfile['saveDate']).strftime("%b %d, %Y %I:%M %p")
                return {'status': 'success', 'extra':{'message': f"Successfully loaded state from {date}!"}}
            
            return {'status': 'success', 'extra':{'message': f"Successfully loaded state!"}}
        except Exception as e:
            self.session.rollback()
            return {'status': 'error', 'error': f'{e}'}

def generateSQLSession(dbName: str, app: Flask) -> MySession:
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{dbName}'
    db.init_app(app)
    with app.app_context():
        db.create_all()

    return MySession(db, app)