from flask import Flask, render_template, abort, redirect, request, url_for
# from sqlalchemy import create_engine, desc
# from sqlalchemy.orm import sessionmaker
from models import Base, Link, Module, Announcement, CalendarItem, FileData, MusicData, Item
import datetime
from typing import Any
from session import MySession, generateSQLSession

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

sqlSession = generateSQLSession('data.db')

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

def checkBounds(var: int, name: str, lower: int, upper: int):
    if (var < lower):
        abort(400, f'`{name}` cannot be smaller than {lower}')
    elif (var > upper):
        abort(400, f'`{name}` cannot be larger than {upper}')
    

@app.route("/")
def home():
    links = sqlSession.getLinksJSON()
    modules = sqlSession.getModulesJSON()
    for module in modules:
        module['blocks'] = sqlSession.getItemsJSON(module['id'])
    announcements = sqlSession.getAnnouncementsJSON()[0:3]
    calendarItems = sqlSession.getCalendarItemsJSON()
    return render_template("home.html", links=links, modules=modules, announcements=announcements, calendarItems=calendarItems)



@app.route("/modules/", methods=["GET","POST","PATCH","PUT","DELETE"])
def modules():
    moduleList = sqlSession.getModulesJSON()
    length = len(moduleList)


    if request.method == "GET":
        links = sqlSession.getLinksJSON()
        for module in moduleList:
            module['blocks'] = sqlSession.getItemsJSON(module['id'])
        return render_template("modules.html", links=links, modules=moduleList)
    
    json = request.json
    position = requiredVar(json, 'position')

    if (position is None):
        position = length + 1
    

    if request.method == "POST":
        checkBounds(position, 'position', 1, length + 1)

        title = requiredVar(json, 'display_name')
        visibility = requiredVar(json, 'hidden')
        
        try:
            moduleObj = Module(position = position, display_name = title, hidden = visibility)
            sqlSession.addModule(moduleObj)
            return success()
        except Exception as e:
            abort(500, e)
        


    elif request.method == "DELETE":
        checkBounds(position, 'position', 1, length)

        try:
            moduleObj = sqlSession.getModule(position)
            sqlSession.deleteModule(moduleObj)
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PATCH":
        checkBounds(position, 'position', 1, length)

        changes = requiredVar(json, 'changes')
        newTitle = optionalVar(changes, 'display_name')
        visibility = optionalVar(changes, 'hidden')

        if (visibility is None and newTitle is None):
            abort(400, '`changes` must include at least one of `display_name` or `hidden` attributes')
        
        try:
            moduleObj = sqlSession.getModule(position)
            if (visibility is not None):
                moduleObj.hidden = visibility
            if (newTitle is not None):
                moduleObj.display_name = newTitle
            sqlSession.session.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PUT":
        checkBounds(position, 'position1', 1, length)

        position2 = requiredVar(json, 'position2')
        checkBounds(position2, 'position2', 1, length)

        if (position == position2):
            abort(400, 'Positions must be different')
        
        try:
            sqlSession.moveModule(position, position2)
            return success()
        except Exception as e:
            abort(500, e)

    

@app.route("/links/", methods=["POST","PATCH","DELETE","PUT"])
def links():
    links = sqlSession.getLinksJSON()
    length = len(links)  
    json = request.json

    position = requiredVar(json, 'position')
    if (position is None):
        position = length + 1


    if request.method == "POST":
        checkBounds(position, 'position', 1, length + 1)

        title = requiredVar(json, 'display_name')
        type = requiredVar(json, 'type')
        url = requiredVar(json, 'url')

        try:
            linkObj = Link(position = position, display_name = title, url = url, type=type)
            sqlSession.addLink(linkObj)
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "DELETE":
        checkBounds(position, 'position', 1, length)

        try:
            linkObj = sqlSession.getLink(position)
            sqlSession.deleteLink(linkObj)
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PATCH":
        checkBounds(position, 'position', 1, length)

        changes = requiredVar(json, 'changes')
        title = optionalVar(changes, 'title')
        type = optionalVar(changes, 'type')
        url = optionalVar(changes, 'url')

        if (title is None and type is None and url is None):
            abort(400, '`changes` must include at least one of `type`, `title`, or `url` attributes')
        
        try:
            linkObj = sqlSession.getLink(position)
            if (title is not None):
                linkObj.display_name = title
            if (type is not None):
                linkObj.type = type
            if (url is not None):
                linkObj.url = url
            sqlSession.session.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PUT":
        checkBounds(position, 'position1', 1, length)

        position2 = requiredVar(json, 'position2')
        checkBounds(position2, 'position2', 1, length)
        
        if (position == position2):
            abort(400, 'Positions must be different')
        
        try:
            sqlSession.moveLink(position, position2)
            return success()
        except Exception as e:
            abort(500, e)


    
@app.route("/items/", methods=["POST","PATCH","DELETE", "PUT"])
def items():    
    json = request.json
    print(json)

    modulePos = requiredVar(json, 'moduleposition')
    mLength = len(sqlSession.getModulesJSON())

    
    checkBounds(modulePos, 'moduleposition', 1, mLength)

    moduleObj = sqlSession.getModule(modulePos)
    items = sqlSession.getItemsJSON(moduleObj.id)
    iLength = len(items)

    position = requiredVar(json, 'position')
    if (position is None):
        position = iLength + 1

    if request.method == "POST":
        checkBounds(position, 'position', 1, iLength + 1)

        title = requiredVar(json, 'display')
        type = requiredVar(json, 'type')
        url = requiredVar(json, 'url')
        visibility = requiredVar(json, 'hidden')

        try:
            itemObj = Item(position = position, display = title, url = url, type=type, module_id=moduleObj.id, hidden=visibility)
            sqlSession.addItem(itemObj)
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "DELETE":
        checkBounds(position, 'position', 1, iLength)

        try:
            itemObj = sqlSession.getItem(modulePos, position)
            sqlSession.deleteItem(itemObj)
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PATCH":
        checkBounds(position, 'position', 1, iLength)

        changes = requiredVar(json, 'changes')
        type = optionalVar(changes, 'type')
        title = optionalVar(changes, 'display_name')
        url = optionalVar(changes, 'url')
        visibility = optionalVar(changes, 'hidden')

        try:
            itemObj = sqlSession.getItem(modulePos, position)
            if (title is not None):
                itemObj.display = title
            if (type is not None):
                itemObj.type = type
            if (url is not None):
                itemObj.url = url
            if (visibility is not None):
                itemObj.hidden = visibility
            sqlSession.session.commit()
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PUT":
        checkBounds(position, 'position1', 1, iLength)

        position2 = requiredVar(json, 'position2')
        checkBounds(position2, 'position2', 1, iLength)

        if (position == position2):
            abort(400, 'Positions must be different')
        
        try:
            sqlSession.moveItem(modulePos, position, position2)
            return success()
        except Exception as e:
            abort(500, e)

    
@app.route("/announcements/", methods=["GET","POST","PATCH","DELETE"])
def announcements():
    if request.method == "GET":
        announcements = sqlSession.getAnnouncementsJSON()
        links = sqlSession.getLinksJSON()
        # calendarItems = sqlSession.getCalendarItemsJSON()
        return render_template("announcements.html", links=links, announcements=announcements)
    

    json = request.json
    id = requiredVar(json, 'id')

    if request.method == "POST":
        date = requiredVar(json, 'date_posted')
        author = requiredVar(json, 'author')
        title = requiredVar(json, 'title')
        content = requiredVar(json, 'content')

        try:
            if not isinstance(date,datetime.datetime):
                date = datetime.datetime.fromisoformat(date)

            announcementObj = Announcement(author = author, title = title, date_posted = date, content = content, id = id)
            sqlSession.addAnnouncement(announcementObj)
            return success()
        except Exception as e:
            abort(500, e)

    elif request.method == "DELETE":
        try:
            announcementObj = sqlSession.session.query(Announcement).get(id)
            sqlSession.deleteAnnouncement(announcementObj)
            return success()
        except Exception as e:
            abort(500, e)

    elif request.method == "PATCH":
        changes = requiredVar(json, 'changes')
        newTitle = optionalVar(changes, 'title')
        newContent = optionalVar(changes, 'content')

        if (newTitle is None and newContent is None):
            abort(400, '`changes` must include at least one of `title` or `content` attributes')

        try:
            announcement = sqlSession.getAnnouncement(id)
            if (announcement is None):
                abort(400, f"This Announcement has not been posted yet")

            if (newTitle is not None):
                announcement.title = newTitle
            if (newContent is not None):
                announcement.content = newContent
            
            sqlSession.session.commit()
            return success()
        except Exception as e:
            abort(500, e)


@app.route("/announcement/<id>")
def announcement(id):
    announcement = sqlSession.session.query(Announcement).get(id)
    if (announcement is not None):
        announcement = announcement.toJSON()
        announcement['initial'] = announcement['author'][0].upper()
        return render_template("announcement.html", announcement=announcement, links=sqlSession.getLinksJSON())
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
            sqlSession.addFile(fileObj)
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "DELETE":
        try:
            fileObj = sqlSession.getFile(key)
            if (fileObj is None):
                abort(400, f"`{path}` is not a registered path")

            sqlSession.deleteFile(fileObj)
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "PATCH":

        changes = requiredVar(json, 'changes')
        path = optionalVar(changes, 'path')
        filename = optionalVar(changes, 'display_name')
        url = optionalVar(changes, 'url')

        try:
            file = sqlSession.getFile(key)
            if (file is None):
                abort(400, f"`{path}` is not a registered path")

            if (filename is not None):
                file.display_name = filename
            if (path is not None):
                file.key = path
            if (url is not None):
                file.url = url
            sqlSession.session.commit()
            return success()
        except Exception as e:
            abort(500, e)


@app.route("/file/<path:key>")
def file(key):
    data = sqlSession.getFile(key)
    if (data is None):
        if (str(key).startswith('https://')):
            return render_template("file.html", header="Unnamed File", url=key, links=sqlSession.getLinksJSON())
        else:
            return render_template("file.html", header="File Not Found", url="about:blank", links=sqlSession.getLinksJSON())

    else:
        data = data.toJSON()
        return render_template("file.html", header= data['display_name'], url=data['url'], links=sqlSession.getLinksJSON())
    


@app.route("/musicdata/", methods=["POST", "PATCH", "DELETE"])
def musicdata():
    json = request.json

    path = requiredVar(json, 'key')

    if request.method == "POST":

        url = requiredVar(json, 'url')
        filename = requiredVar(json, 'display_name')

        try:
            musicObj = MusicData(key = path, url = url, display_name = filename)
            sqlSession.addMusic(musicObj)
            return success()
        except Exception as e:
            abort(500, e)



    elif request.method == "DELETE":
        try:
            musicObj = sqlSession.getMusic(path)
            if (musicObj is None):
                abort(400, f"`{path}` is not a registered path")

            sqlSession.deleteMusic(musicObj)
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
            musicObj = sqlSession.getMusic(path)
            if (musicObj is None):
                abort(400, f"`{path}` is not a registered path")

            if (new_path is not None):
                musicObj.key = new_path
            if (filename is not None):
                musicObj.display_name = filename
            if (url is not None):
                musicObj.url = url
            sqlSession.session.commit()
            return success()
        except Exception as e:
            abort(500, e)


@app.route("/music/<path:key>")
def music(key):
    data = sqlSession.getMusic(key)
    if (data is None):
        if (str(key).startswith('https://')):
            return render_template("music.html", header="Unnamed Sheetmusic", url=key, links=sqlSession.getLinksJSON())
        else:
            return render_template("music.html", header="Music Not Found", url="about:blank", links=sqlSession.getLinksJSON())
    else:
        data = data.toJSON()
        return render_template("music.html", header=data['display_name'], url=data['url'], links=sqlSession.getLinksJSON())

@app.route("/calendar/")
def calendar():
    links = sqlSession.getLinksJSON()
    return render_template("calendar.html", links=links)

@app.route("/savestate/")
def savestate():
    return sqlSession.saveState()

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

# if __name__ == "__main__":
#     # app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT",8080))) #for google cloud
#     app.run(debug=True) #for localhost