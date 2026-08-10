from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker, Session
from models import Base, Link, Module, Announcement, CalendarItem, FileData, MusicData, Item
import datetime
from typing import Any
from zoneinfo import ZoneInfo
import json

class MySession():
    def __init__(self, session: Session):
        self.session = session

    def getLinksJSON(self) -> list[dict[str, Any]]:
        """Returns all `Link` objects in the database parsed as Python `dict` objects"""
        links = self.session.query(Link).order_by(Link.position).all()
        obj = []
        for link in links:
            obj.append(link.toJSON())
        return obj

    def getModulesJSON(self) -> list[dict[str, Any]]:
        """Returns all `Module` objects in the database parsed as Python `dict` objects"""
        modules = self.session.query(Module).order_by(Module.position).all()
        obj = []
        for module in modules:
            obj.append(module.toJSON())
        return obj

    def getItemsJSON(self, id) -> list[dict[str, Any]]:
        items = self.session.query(Item).filter_by(module_id=id).order_by(Item.position).all()
        obj = []
        for item in items:
            obj.append(item.toJSON())
        return obj

    def getFilesJSON(self) -> list[dict[str, Any]]:
        files = self.session.query(FileData).order_by(FileData.display_name).all()
        obj = []
        for item in files:
            obj.append(item.toJSON())
        return obj

    def getMusicsJSON(self) -> list[dict[str, Any]]:
        musics = self.session.query(MusicData).order_by(MusicData.display_name).all()
        obj = []
        for item in musics:
            obj.append(item.toJSON())
        return obj
    
    def getAllItemsJSON(self) -> list[dict[str, Any]]:
        items = self.session.query(Item).order_by(Item.module_id, Item.position).all()
        obj = []
        for item in items:
            obj.append(item.toJSON())
        return obj

    def getAnnouncementsJSON(self) -> list[dict[str, Any]]:
        announcements = self.session.query(Announcement).order_by(desc(Announcement.date_posted)).all()
        obj = []
        for announcement in announcements:
            obj.append(announcement.toJSON())
        return obj

    def getAnnouncementsJSONSerialized(self) -> list[dict[str, Any]]:
        announcements = self.session.query(Announcement).order_by(desc(Announcement.date_posted)).all()
        obj = []
        for announcement in announcements:
            temp = announcement.toJSON()
            temp['date_posted'] = temp['date_posted'].isoformat()
            obj.append(temp)
        return obj

    def getCalendarItemsJSON(self) -> list[dict[str, Any]]:
        calendarItems = self.session.query(CalendarItem).order_by(CalendarItem.target_date).all()
        obj = []
        for calendarItem in calendarItems:
            if (datetime.now() <= calendarItem.target_date and datetime.now() + datetime.timedelta(weeks=1) >= calendarItem.target_date):
                obj.append(calendarItem.toJSON())
            else:
                break
        return obj

    def getModule(self, position) -> Module | None:
        return self.session.query(Module).filter_by(position=position).first()

    def getLink(self, position) -> Link | None:
        return self.session.query(Link).filter_by(position=position).first()

    def getFile(self, key) -> FileData | None:
        return self.session.query(FileData).filter_by(key=key).first()
    
    def getMusic(self, key) -> MusicData | None:
        return self.session.query(MusicData).filter_by(key=key).first()

    def getItem(self, modulePos, itemPos) -> Item | None:
        return self.session.query(Item).filter_by(module_id = self.getModule(modulePos).id, position=itemPos).first()
    
    def getAnnouncement(self, id) -> Announcement | None:
        return self.session.query(Announcement).filter_by(id = id).first()

    def moveLink(self, pos1, pos2):
        link1 = self.getLink(pos1)
        linkList = self.session.query(Link).order_by(Link.position).all()
        linkList.remove(link1)
        linkList.insert(pos2 - 1, link1)
        minPos = pos1 if pos1 < pos2 else pos2
        print(f"start: {minPos}; stop: {len(linkList)}")
        for i in range(minPos - 1, len(linkList)):
            linkList[i].position = i + 1
        self.session.commit()

    def moveModule(self, pos1, pos2):
        module1 = self.getModule(pos1)
        moduleList = self.session.query(Module).order_by(Module.position).all()
        moduleList.remove(module1)
        moduleList.insert(pos2 - 1, module1)
        minPos = pos1 if pos1 < pos2 else pos2
        for i in range(minPos - 1, len(moduleList)):
            moduleList[i].position = i+1
        self.session.commit()

    def moveItem(self, modulePos, pos1, pos2):
        item1 = self.getItem(modulePos, pos1)
        itemList = self.session.query(Item).filter_by(module_id = item1.module_id).order_by(Item.position).all()
        itemList.remove(item1)
        itemList.insert(pos2 - 1, item1)
        minPos = pos1 if pos1 < pos2 else pos2
        for i in range(minPos - 1, len(itemList)):
            itemList[i].position = i+1
        self.session.commit()

    def addModule(self, module: Module):
        all = self.session.query(Module).order_by(Module.position).all()
        self.session.add(module)
        all.insert(module.position-1, module)
        for i in range(module.position, len(all)):
            all[i].position = i + 1
        self.session.commit()

    def addLink(self, link: Link):
        all = self.session.query(Link).order_by(Link.position).all()
        self.session.add(link)
        all.insert(link.position-1, link)
        for i in range(link.position, len(all)):
            all[i].position = i + 1
        self.session.commit()

    def addItem(self, item: Item):
        all = self.session.query(Item).filter_by(module_id = item.module_id).order_by(Item.position).all()
        self.session.add(item)
        all.insert(item.position-1, item)
        for i in range(item.position, len(all)):
            all[i].position = i + 1
        self.session.commit()

    def addFile(self, file: FileData):
        self.session.add(file)
        self.session.commit()

    def addMusic(self, music: MusicData):
        self.session.add(music)
        self.session.commit()

    def addAnnouncement(self, announcement: Announcement):
        self.session.add(announcement)
        self.session.commit()

    def deleteModule(self, module: Module):
        all = self.session.query(Module).order_by(Module.position).all()
        all.remove(module)
        for i in range(module.position - 1, len(all)):
            all[i].position = i + 1
        self.session.query(Item).filter_by(module_id=module.id).delete()
        self.session.delete(module)
        self.session.commit()

    def deleteLink(self, link: Link):
        all = self.session.query(Link).order_by(Link.position).all()
        all.remove(link)
        for i in range(link.position - 1, len(all)):
            all[i].position = i + 1
        self.session.delete(link)
        self.session.commit()

    def deleteItem(self, item: Item):
        all = self.session.query(Item).filter_by(module_id = item.module_id).order_by(Item.position).all()
        all.remove(item)
        for i in range(item.position - 1, len(all)):
            all[i].position = i + 1
        self.session.delete(item)
        self.session.commit()

    def deleteFile(self, file: FileData):
        self.session.delete(file)
        self.session.commit()

    def deleteMusic(self, music: MusicData):
        self.session.delete(music)
        self.session.commit()

    def deleteAnnouncement(self, announcement: Announcement):
        self.session.delete(announcement)
        self.session.commit()

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

def generateSQLSession(dbName) -> MySession:
    engine = create_engine("sqlite:///" + dbName)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return MySession(Session())