from flask import Flask, render_template, abort, redirect, request, url_for
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker
from models import Base, Link, Module, Announcement, CalendarItem, FileData, MusicData, Item
import datetime
from typing import Any

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

def getFile(key):
    return sqlSession.query(FileData).filter_by(key=key).first()

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

def requiredVar(var: dict[str, Any], item: str):
    try:
        test = var[item]
        return test
    except:
        abort(400, f'Missing required `{item}` attribute')

def optionalVar(var: dict[str, Any], item: str):
    try:
        test = var[item]
        return test
    except:
        return None

    

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
    moduleList = getModulesJSON()
    length = len(moduleList)


    if request.method == "GET":
        links = getLinksJSON()
        for module in moduleList:
            module['blocks'] = getItemsJSON(module['id'])
        return render_template("modules.html", links=links, modules=moduleList)
    
    json = request.json
    position = requiredVar(json, 'position')

    if (position is None):
        position = length + 1
    elif (position > length + 1):
        abort(400, f'`position` cannot be larger than {length + 1}')

    if request.method == "POST":

        title = requiredVar(json, 'display_name')
        
        try:
            moduleObj = Module(position = position, display_name = title, hidden = module['hidden'])
            sqlSession.add(moduleObj)
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)
        


    elif request.method == "DELETE":
        try:
            moduleObj = getModule(position)
            id = int(moduleObj.id)
            sqlSession.delete(moduleObj)
            sqlSession.query(Item).filter_by(module_id = id).delete()
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PATCH":

        changes = requiredVar(json, 'changes')
        newTitle = optionalVar(changes, 'display_name')
        visibility = optionalVar(changes, 'hidden')

        if (visibility is None and newTitle is None):
            abort(400, '`changes` must include at least one of `display_name` or `hidden` attributes')
        
        try:
            moduleObj = getModule(position)
            if (visibility is not None):
                moduleObj.hidden = visibility
            if (newTitle is not None):
                moduleObj.display_name = newTitle
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PUT":

        position2 = requiredVar(json, 'position2')

        if (position2 > length + 1):
            abort(400, f'`position2` cannot be larger than {length + 1}')
        if (position == position2):
            abort(400, 'Positions must be different')
        
        try:
            moveModule(position, position2)
            return success()
        except Exception as e:
            abort(500, e)

    

@app.route("/links/", methods=["POST","PATCH","DELETE","PUT"])
def links():
    links = getLinksJSON()
    length = len(links)  
    json = request.json

    position = requiredVar(json, 'position')
    if (position is None):
        position = length + 1
    if (position > length + 1):
        abort(400, f'`position` cannot be larger than {length + 1}')

    if request.method == "POST":

        title = requiredVar(json, 'display_name')
        type = requiredVar(json, 'type')
        url = requiredVar(json, 'url')

        try:
            linkObj = Link(position = position, display_name = title, url = url, type=type)
            sqlSession.add(linkObj)
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "DELETE":
        try:
            linkObj = getLink(position)
            sqlSession.delete(linkObj)
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PATCH":

        changes = requiredVar(json, 'changes')
        title = optionalVar(changes, 'title')
        type = optionalVar(changes, 'type')
        url = optionalVar(changes, 'url')

        if (title is None and type is None and url is None):
            abort(400, '`changes` must include at least one of `type`, `title`, or `url` attributes')
        
        try:
            linkObj = getLink(position)
            if (title is not None):
                linkObj.display_name = title
            if (type is not None):
                linkObj.type = type
            if (url is not None):
                linkObj.url = url
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PUT":
        position2 = requiredVar(json, 'position2')

        if (position2 > length + 1):
            abort(400, f'`position2` cannot be larger than the number of items: {length + 1}')
        if (position == position2):
            abort(400, 'Positions must be different')
        
        try:
            moveLink(position, position2)
            return success()
        except Exception as e:
            abort(500, e)


    
@app.route("/items/", methods=["POST","PATCH","DELETE", "PUT"])
def items():    
    json = request.json

    modulePos = requiredVar(json, 'moduleposition')
    mLength = len(getModulesJSON())

    if (modulePos > mLength):
        abort(400, f'`moduleposition` cannot be larger than {mLength}')

    moduleObj = getModule(modulePos)
    items = getItemsJSON(moduleObj.id)
    iLength = len(items)

    position = requiredVar(json, 'position')
    if (position > iLength + 1):
        abort(400, f'`position` cannot be larger than {iLength + 1}')

    if request.method == "POST":

        title = requiredVar(json, 'display')
        type = requiredVar(json, 'type')
        url = requiredVar(json, 'url')
        visibility = requiredVar(json, 'hidden')

        try:
            itemObj = Item(position = position, display = title, url = url, type=type, module_id=moduleObj.id, hidden=visibility)
            sqlSession.add(itemObj)
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "DELETE":
        try:
            itemObj = getItem(modulePos, position)
            sqlSession.delete(itemObj)
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PATCH":
        changes = requiredVar(json, 'changes')
        type = optionalVar(changes, 'type')
        title = optionalVar(changes, 'display_name')
        url = optionalVar(changes, 'url')
        visibility = optionalVar(changes, 'hidden')

        try:
            itemObj = getItem(modulePos, position)
            if (title is not None):
                itemObj.display = title
            if (type is not None):
                itemObj.type = type
            if (url is not None):
                itemObj.url = url
            if (visibility is not None):
                itemObj.hidden = visibility
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PUT":
        position2 = requiredVar(json, 'position2')

        if (position2 > iLength + 1):
            abort(400, f'`position2` cannot be larger than {iLength + 1}')
        if (position == position2):
            abort(400, 'Positions must be different')
        
        try:
            moveItem(modulePos, position, position2)
            return success()
        except Exception as e:
            abort(500, e)

    
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
    json = request.json

    key = requiredVar(json, 'key')

    if request.method == "POST":

        url = requiredVar(json, 'url')
        title = requiredVar(json, 'display_name')

        try:
            fileObj = FileData(key = key, url = url, display_name = title)
            sqlSession.add(fileObj)
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "DELETE":
        try:
            fileObj = sqlSession.query(FileData).get(key)
            sqlSession.delete(fileObj)
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PATCH":

        changes = requiredVar(json, 'changes')
        path = optionalVar(changes, 'path')
        filename = optionalVar(changes, 'display_name')
        url = optionalVar(changes, 'url')

        try:
            file = getFile(key)
            if (filename is not None):
                file.display_name = filename
            if (path is not None):
                file.key = path
            if (url is not None):
                file.url = url
            sqlSession.commit()
        except Exception as e:
            abort(500, e)


@app.route("/file/<path:key>")
def file(key):
    data = sqlSession.query(FileData).get(key)
    if (data is None):
        return render_template("file.html", header="Unnamed File", url=key)
    else:
        data = data.toJSON()
        return render_template("file.html", header= data['display_name'], url=data['url'])
    


@app.route("/musicdata/", methods=["POST", "PATCH", "DELETE"])
def musicdata():
    json = request.json

    path = requiredVar(json, 'key')

    if request.method == "POST":

        url = requiredVar(json, 'url')
        filename = requiredVar(json, 'display_name')

        try:
            musicObj = MusicData(key = path, url = url, display_name = filename)
            sqlSession.add(musicObj)
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "DELETE":
        try:
            musicObj = sqlSession.query(MusicData).get(path)
            sqlSession.delete(musicObj)
            sqlSession.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PATCH":

        changes = requiredVar(json, 'changes')
        new_path = optionalVar(changes, 'path')
        filename = optionalVar(changes, 'display_name')
        url = optionalVar(changes,'url')

        if (new_path is None and filename is None and url is None):
            abort(400, 'At least one of `new_path`, `filename`, or `url` must be defined')

        try:
            musicObj = sqlSession.query(MusicData).get(path)
            if (new_path is not None):
                musicObj.key = new_path
            if (filename is not None):
                musicObj.display_name = filename
            if (url is not None):
                musicObj.url = url
            sqlSession.commit()
        except Exception as e:
            abort(500, e)


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