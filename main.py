from flask import Flask, render_template, abort, redirect, request, url_for
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker
from models import Base, Link, Module, Announcement, CalendarItem, FileData, MusicData, Item
import datetime
import os

def error(message):
    return {
        'status': 'error',
        'message': message
    }

def success():
    return {
        'status': 'success'
    }

app = Flask(__name__)

def generateSQLSession(dbName):
    engine = create_engine("sqlite:///" + dbName, echo=True)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return Session()

sqlSession = generateSQLSession('data.db')

def getLinksJSON():
    links = sqlSession.query(Link).order_by(Link.position).all()
    obj = []
    for link in links:
        obj.append(link.toJSON())
    return obj

def getModulesJSON():
    modules = sqlSession.query(Module).order_by(Module.position).all()
    obj = []
    for module in modules:
        obj.append(module.toJSON())
    return obj

def getItemsJSON(id):
    items = sqlSession.query(Item).filter_by(module_id=id).order_by(Item.position).all()
    obj = []
    for item in items:
        obj.append(item.toJSON())
    return obj

def getAnnouncementsJSON():
    announcements = sqlSession.query(Announcement).order_by(desc(Announcement.date_posted)).all()
    obj = []
    for announcement in announcements:
        announcement.date_posted = announcement.date_posted.date()
        obj.append(announcement.toJSON())
    return obj

def getCalendarItemsJSON():
    calendarItems = sqlSession.query(CalendarItem).order_by(CalendarItem.target_date).all()
    obj = []
    for calendarItem in calendarItems:
        if (datetime.now() <= calendarItem.target_date and datetime.now() + datetime.timedelta(weeks=1) >= calendarItem.target_date):
            obj.append(calendarItem.toJSON())
        else:
            break
    return obj

def getModule(position):
    return sqlSession.query(Module).filter_by(position=position).first()

def getLink(position):
    return sqlSession.query(Link).filter_by(position=position).first()

def getItem(modulePos, itemPos):
    return sqlSession.query(Item).filter_by(module_id = getModule(modulePos).id, position=itemPos).first()

def moveLink(pos1, pos2):
    link1 = getLink(pos1)
    linkList = sqlSession.query(Link).order_by(Link.position).all()
    linkList.remove(link1)
    linkList.insert(pos2 - 1, link1)
    minPos = pos1 if pos1 < pos2 else pos2
    for i in range(minPos, len(linkList)):
        linkList[i].position = i+1
    sqlSession.commit()

def moveModule(pos1, pos2):
    module1 = getModule(pos1)
    moduleList = sqlSession.query(Module).order_by(Module.position).all()
    moduleList.remove(module1)
    moduleList.insert(pos2 - 1, module1)
    minPos = pos1 if pos1 < pos2 else pos2
    for i in range(minPos, len(moduleList)):
        moduleList[i].position = i+1
    sqlSession.commit()

def moveItem(modulePos, pos1, pos2):
    item1 = getItem(modulePos, pos1)
    itemList = sqlSession.query(Item).filter_by(module_id = item1.module_id).order_by(Item.position).all()
    itemList.remove(item1)
    itemList.insert(pos2 - 1, item1)
    minPos = pos1 if pos1 < pos2 else pos2
    for i in range(minPos, len(itemList)):
        itemList[i].position = i+1
    sqlSession.commit()
    

@app.route("/")
def home():
    links = getLinksJSON()
    modules = getModulesJSON()
    for module in modules:
        module['blocks'] = getItemsJSON(module['id'])
    announcements = getAnnouncementsJSON()[0:3]
    calendarItems = getCalendarItemsJSON()
    return render_template("home.html", links=links, modules=modules, announcements=announcements, calendarItems=calendarItems)

@app.route("/modules/", methods=["GET","POST","PATCH","PUT","DELETE"])
def modules():
    modules = getModulesJSON()
    length = len(modules)
    if request.method == "GET":
        links = getLinksJSON()
        for module in modules:
            module['blocks'] = getItemsJSON(module['id'])
        return render_template("modules.html", links=links, modules=modules)
    
    module = request.json
    if request.method == "POST":
        try:
            title = module['display_name']
        except:
            return error('Missing required `display_name` attribute')
        try:
            position = module['position']
        except:
            return error('Missing required `position` attribute')
        if (position is None):
            position = length + 1
        elif (position > length + 1):
            return error(f'`position` cannot be larger than the number of modules: {length + 1}')
        try:
            moduleObj = Module(position = position, display_name = title, hidden = module['hidden'])
            sqlSession.add(moduleObj)
            sqlSession.commit()
            return success()
        except Exception as e:
            return error(f'{e}')

    elif request.method == "DELETE":
        try:
            position = module['position']
        except:
            return error('Missing required position attribute')
        
        if (position > length + 1):
            return error(f'`position` cannot be larger than the number of modules: {length + 1}')

        try:
            moduleObj = getModule(position)
            id = int(moduleObj.id)
            sqlSession.delete(moduleObj)
            sqlSession.query(Item).filter_by(module_id = id).delete()
            sqlSession.commit()
            return success()
        except Exception as e:
            return error(f'{e}')

    elif request.method == "PATCH":
        try:
            position = module['position']
        except:
            return error('Missing required position attribute')
        if (position > length + 1):
            return error(f'`position` cannot be larger than the number of modules: {length + 1}')
        try:
            changes = module['changes']
        except:
            return error('Missing required changes attribute')
        try:
            newTitle = changes['display_name']
        except:
            pass
        try:
            visibility = changes['hidden']
        except:
            pass
        if (visibility is None and newTitle is None):
            return error('changes attribute must include at least one of `display_name` or `hidden` attributes')
        try:
            moduleObj = getModule(position)
            if (visibility is not None):
                moduleObj.hidden = visibility
            if (newTitle is not None):
                moduleObj.display_name = newTitle
            sqlSession.commit()
            return success()
        except Exception as e:
            return error(f'{e}')

    elif request.method == "PUT":
        try:
            position1 = module['position1']
        except:
            return error('Missing required position1 attribute')
        try:
            position2 = module['position2']
        except:
            return error('Missing required position2 attribute')
        if (position1 > length + 1):
            return error(f'`position1` cannot be larger than the number of modules: {length + 1}')
        if (position2 > length + 1):
            return error(f'`position2` cannot be larger than the end of the list: {length + 1}')
        if (position2 == position1):
            return error('Positions must be different')
        
        try:
            moveModule(position1, position2)
            return success()
        except Exception as e:
            return error(f'{e}')

    

@app.route("/links/", methods=["POST","PATCH","DELETE","PUT"])
def links():
    links = getLinksJSON()
    length = len(links)  
    link = request.json
    if request.method == "POST":
        try:
            position = link['position']
        except:
            return error('Missing required position attribute')
        if (position is None):
            position = length + 1
        try:
            title = link['display_name']
        except:
            return error('Missing required display_name attribute')
        try:
            type = link['type']
        except:
            return error('Missing required type attribute')
        try:
            url = link['url']
        except:
            return error('Missing required url attribute')
        try:
            linkObj = Link(position = position, display_name = title, url = url, type=type)
            sqlSession.add(linkObj)
            sqlSession.commit()
            return success()
        except Exception as e:
            return error(f'{e}')

    elif request.method == "DELETE":
        try:
            position = link['position']
        except:
            return error('Missing required position attribute')
        if (position > length + 1):
            return error(f'`position` cannot be larger than the number of links: {length + 1}')
        try:
            linkObj = getLink(position)
            sqlSession.delete(linkObj)
            sqlSession.commit()
            return success()
        except Exception as e:
            return error(f'{e}')

    elif request.method == "PATCH":
        try:
            position = link['position']
        except:
            return error('Missing required position attribute')
        if (position > length + 1):
            return error(f'`position` cannot be larger than the number of links: {length + 1}')
        try:
            changes = link['changes']
        except:
            return error('Missing required changes attribute')
        try:
            title = changes['title']
        except:
            pass
        try:
            type = changes['type']
        except:
            pass
        try:
            url = changes['url']
        except:
            pass
        if (title is None and type is None and url is None):
            return error('At least one of `type`, `title`, or `url` must be defined')
        try:
            link = getLink(position)
            if (title is not None):
                link.display_name = title
            if (type is not None):
                link.type = type
            if (url is not None):
                link.url = url
            sqlSession.commit()
        except Exception as e:
            return error(f'{e}')
    elif request.method == "PUT":
        try:
            position1 = link['position1']
        except:
            return error('Missing required position1 attribute')
        try:
            position2 = link['position2']
        except:
            return error('Missing required position2 attribute')
        if (position1 > length + 1):
            return error(f'`position1` cannot be larger than the number of items: {length + 1}')
        if (position2 > length + 1):
            return error(f'`position2` cannot be larger than the number of items: {length + 1}')
        if (position1 == position2):
            return error('Positions must be different')
        try:
            moveLink(position1, position2)
            return success()
        except Exception as e:
            return error(f'{e}')
    
@app.route("/items/", methods=["POST","PATCH","DELETE"])
def items():    
    item = request.json
    if request.method == "POST":
        try:
            itemObj = Item(position = item['position'], display = item['display'], url = item['url'], type=item['type'], module_id=item['module_id'], hidden=item['hidden'])
            sqlSession.add(itemObj)
            sqlSession.commit()
            return success()
        except:
            return error('Invalid Item Object')

    elif request.method == "DELETE":
        try:
            id = item['id']
            try:
                itemObj = sqlSession.query(Item).get(id)
                sqlSession.delete(itemObj)
                sqlSession.commit()
                return success()
            except:
                return error('Could not delete the item')
        except:
            return error('Invalid Item Object')

    elif request.method == "PATCH":
        # passes a "changes" object of sorts?
        return "Unsupported Request: Build in Progress..."
    
@app.route("/announcements/", methods=["GET","POST","PATCH","DELETE"])
def announcements():
    if request.method == "GET":
        announcements = getAnnouncementsJSON()
        links = getLinksJSON()
        calendarItems = getCalendarItemsJSON()
        return render_template("announcements.html", links=links, announcements=announcements)
    announcement = request.json
    if request.method == "POST":
        try:
            date = announcement['date_posted']
            if not isinstance(date,datetime.datetime):
                print("Not a date")
                date = datetime.datetime.fromisoformat(date)
            print(date, type(date))
            announcementObj = Announcement(author = announcement['author'], title = announcement['title'], date_posted = date, content = announcement['content'])
            sqlSession.add(announcementObj)
            sqlSession.commit()
            return success()
        except:
            return error('Invalid Announcement Object')

    elif request.method == "DELETE":
        try:
            id = announcement['id']
            try:
                announcementObj = sqlSession.query(Announcement).get(id)
                sqlSession.delete(announcementObj)
                sqlSession.commit()
            except:
                return "Could not delete the announcement"
        except:
            return "Invalid Announcement Object"

    elif request.method == "PATCH":
        # passes a "changes" object of sorts?
        return "Unsupported Request: Build in Progress..."


@app.route("/announcement/<id>")
def announcement(id):
    announcement = sqlSession.query(Announcement).get(id)
    if (announcement is not None):
        announcement = announcement.toJSON()
        announcement['initial'] = announcement['author'][0].upper()
        return render_template("announcement.html", announcement=announcement, links=getLinksJSON())
    else:
        return redirect(url_for("announcements"))

@app.route("/files/", methods=["POST", "PATCH", "DELETE"])
def files():
    filedata = request.json
    if request.method == "POST":
        try:
            fileObj = FileData(key = filedata['key'], id = filedata['id'], display_name = filedata['display_name'])
            sqlSession.add(fileObj)
            sqlSession.commit()
            return success()
        except:
            return error('Invalid FileData Object')

    elif request.method == "DELETE":
        try:
            key = filedata['key']
            try:
                linkObj = sqlSession.query(FileData).get(key)
                sqlSession.delete(linkObj)
                sqlSession.commit()
                return success()
            except:
                return error('Could not delete the file data')
        except:
            return error('Invalid FileData Object')

    elif request.method == "PATCH":
        # passes a "changes" object of sorts?
        return "Unsupported Request: Build in Progress..."

@app.route("/file/<key>")
def file(key):
    data = sqlSession.query(FileData).get(key)
    if (data is None):
        return render_template("file.html", header="Unnamed File", id=key)
    else:
        data = data.toJSON()
        return render_template("file.html", header= data['display_name'], id=data['id'])
    
@app.route("/musicdata/", methods=["POST", "PATCH", "DELETE"])
def musicdata():
    musicdata = request.json
    if request.method == "POST":
        try:
            musicObj = MusicData(key = musicdata['key'], url = musicdata['url'], display_name = musicdata['display_name'])
            sqlSession.add(musicObj)
            sqlSession.commit()
            return success()
        except:
            return error('Invalid MusicData Object')

    elif request.method == "DELETE":
        try:
            key = musicdata['key']
            try:
                musicObj = sqlSession.query(MusicData).get(key)
                sqlSession.delete(musicObj)
                sqlSession.commit()
                return success()
            except:
                return error('Could not delete the music data')
        except:
            return error('Invalid MusicData Object')

    elif request.method == "PATCH":
        # passes a "changes" object of sorts?
        return "Unsupported Request: Build in Progress..."

@app.route("/music/<path:key>")
def music(key):
    data = sqlSession.query(MusicData).get(key)
    if (data is None):
        return render_template("music.html", header="Unnamed Sheetmusic", url=key)
    else:
        data = data.toJSON()
        return render_template("music.html", header=data['display_name'], url=data['url'])

@app.route("/calendar/")
def calendar():
    links = getLinksJSON()
    return render_template("calendar.html", links=links)

@app.route("/page/<id>")
def page(id):
    pass

# @app.route("/kitchen/")
# def kitchen_page():
#     orders = session.query(Order).order_by(Order.date_created).all()
#     ordersInJSONFormat = []
#     for order in orders:
#         ordersInJSONFormat.append(order.toJSON())
#     print(ordersInJSONFormat)
#     return render_template("kitchen.html", orders=ordersInJSONFormat)

# @app.route("/delete/<order_id>")
# def delete(order_id):
#     order_to_delete = session.query(Order).get(order_id)
#     if order_to_delete is None:
#         abort(404)
#     try:
#         session.delete(order_to_delete)
#         session.commit()
#         return redirect(url_for("kitchen_page"))
#     except:
#         return 'There was a problem deleting that task'

if __name__ == "__main__":
    # app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT",8080))) #for google cloud
    app.run(debug=True) #for localhost