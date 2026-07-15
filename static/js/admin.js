window.addEventListener('load', adminsetup);
window.prevent = false;

function adminsetup() {
    linkDragAndDrop();
}

function linkDragAndDrop() {
    let link_list = document.querySelector('#sidebar2>ul');
    let dragged_link = null;
    let spacer = null;
    link_list.addEventListener("pointerdown", (e) => {
        if (e.button == 0 && e.target.tagName == 'DIV') {
            e.preventDefault();
            dragged_link = getLinkListTarget(e.target);

            let position1 = [...document.querySelector('#sidebar2>ul').children].indexOf(dragged_link) + 1;

            spacer = document.createElement('LI');
            spacer.style.height = dragged_link.getBoundingClientRect().height - 2;
            spacer.classList.add('spacer');
            let spaceInserted = false;

            // let pos2 = e.clientY;
            let offset = e.clientY - dragged_link.getBoundingClientRect().top;

            document.addEventListener("touchmove", preventTouchScroll, {passive: false});
            
            document.onpointermove = (e2) => {
                e2.preventDefault();
                if (!dragged_link.classList.contains("dragging")) {
                    dragged_link.style.width = dragged_link.getBoundingClientRect().width;
                    dragged_link.classList.add("dragging");
                }
                
                // let pos1 = pos2 - e2.clientY;
                // dragged_link.style.top = Math.min(Math.max(link_list.offsetTop, dragged_link.offsetTop - pos1), link_list.lastElementChild.offsetTop);
                // if (link_list.offsetTop <= dragged_link.offsetTop - pos1 && dragged_link.offsetTop - pos1 <= link_list.lastElementChild.offsetTop) {
                //     pos2 = e2.clientY;

                // }
                dragged_link.style.top = Math.min(Math.max(link_list.offsetTop, e2.clientY - offset - link_list.parentNode.getBoundingClientRect().top), link_list.lastElementChild.offsetTop);
                if (!spaceInserted) {
                    link_list.insertBefore(spacer, dragged_link);
                    spaceInserted = true;
                }

                let draggables = [...link_list.querySelectorAll('li.draggable-link:not(.dragging)')];
                let closestLink = null;
                let closestOffset = Number.NEGATIVE_INFINITY;

                for (let i = 0; i < draggables.length; i++) {
                    let box = draggables[i].getBoundingClientRect();
                    let offset = e2.clientY - box.top - box.height / 2;
                    if (offset < 0 && offset > closestOffset) {
                        closestLink = draggables[i];
                        closestOffset = offset;
                    }
                }

                let last_over = link_list.querySelector('li.over');

                if (closestLink) {
                    if (last_over && last_over != closestLink) {
                        last_over.classList.remove('over');
                        closestLink.classList.add('over');
                    }
                    else if (!last_over) {
                        closestLink.classList.add('over');
                    }
                    // link_list.insertBefore(dragged_link, closestLink);
                }
                else {
                    if (last_over && last_over != link_list.lastElementChild) {
                        last_over.classList.remove('over');
                        link_list.lastElementChild.classList.add('over');
                    }
                    if (!last_over) {
                        link_list.lastElementChild.classList.add('over');
                    }
                    // link_list.appendChild(dragged_link);
                }
            }

            document.onpointerup = async (e2) => {
                e2.preventDefault();
                document.onpointermove = null;
                document.onpointerup = null;
                document.removeEventListener("touchmove", preventTouchScroll,{passive: false});
                dragged_link.classList.remove("dragging");
                dragged_link.removeAttribute("style");

                let last_over = link_list.querySelector('li.over');
                if (last_over) {
                    let position2 = [...document.querySelectorAll('#sidebar2>ul>li:not(.spacer)')].indexOf(last_over) + 1;
                    if (position2 > position1) position2--;

                    if (position2 != position1) {
                        let obj = {
                            position: position1,
                            position2: position2
                        };

                        try {
                            let response = await putData('/links/', obj);
                            if (response) {
                                last_over.classList.remove('over');
                                link_list.insertBefore(dragged_link, last_over);
                                // location.reload();
                            }
                        }
                        catch (error) {
                            alert(`Server Error: ${error}`);
                        }
                    }
                }
                
            
                dragged_link = null;
                if (spaceInserted) link_list.removeChild(spacer);
            }
        }
            // getLinkListTarget(e.target).setAttribute('draggable', true);
    });
}

function preventTouchScroll(event) {
    event.preventDefault();
}

function getLinkListTarget(element) {
    const classlist = element.classList;
    if (classlist.contains('draggable-link')) return element;
    else if (classlist.contains('link-drag-handle') || classlist.contains('edit-link') || element.tagName == 'A') return element.parentNode;
    else return element.parentNode.parentNode;
}

function linkMenu(title, display_name, type, url, hasDelete) {
    let overlay = document.createElement("div");
    overlay.id = 'overlay';
    overlay.innerHTML = `
    <div class="dialog">
        <h3>${title}</h3>
        <div class="menu">
            <form id="linkForm">
                <label for="linkTitle">Title:</label><br>
                <input type="text" id="linkTitle" name="title" placeholder="${display_name}" value="${display_name}" required><br><br><br>
                <label for="linkType">Type:</label><br>
                <div class="scope">
                    <select id="linkType" name="type" required>
                        <option value="external"${(type == 'external')? ' selected=""': ''}>External</option>
                        <option value="internal"${(type == 'internal')? ' selected=""': ''}>Internal</option>
                        <option value="page"${(type == 'page')? ' selected=""': ''}>Page</option>
                        <option value="announcement"${(type == 'announcement')? ' selected=""': ''}>Announcement</option>
                        <option value="file"${(type == 'file')? ' selected=""': ''}>File</option>
                        <option value="music"${(type == 'music')? ' selected=""': ''}>Music</option>
                    </select>
                </div><br><br>
                <div>
                    <label id="labelURL1" for="linkURL1" ${(type == 'internal'? '': 'style="display: none;" disabled')}>URL:</label>
                    <label id="labelURL2" for="linkURL2" ${(type == 'internal'? 'style="display: none;" disabled': '')}>${(type == 'announcement'? 'ID:': 'Path:')}</label>
                </div>
                <div>
                    <div class="scope">
                        <select id="linkURL1" name="url1" ${(type == 'internal')? 'required': 'style="display: none;" disabled'}>
                            <option value="home"${(url == 'home')? ' selected=""': ''}>Home</option>
                            <option value="modules"${(url == 'modules')? ' selected=""': ''}>Modules</option>
                            <option value="announcements"${(url == 'announcements')? ' selected=""': ''}>Announcements</option>
                        </select>
                    </div>
                    <input type="${(type == 'external')? 'url': 'text'}" id="linkURL2" name="url2" placeholder="${url}" value="${url}" ${(type == 'internal')? 'style="display: none;" disabled': 'required'}>
                </div>
                <br><br><br>
                <div class="buttonHolder">
                    <button type="button" class="menuCancel">Cancel</button>
                    ${(hasDelete)? '<button type="button" class="menuDelete">Delete</button>': ''}
                    <input type="submit" class="menuSubmit" value="Submit">
                </div><br>
            </form>
        </div>
    </div>`;

    document.body.appendChild(overlay);

    overlay.querySelectorAll('#linkType > option').forEach((element) => {
        element.addEventListener('pointerup', (event) => {
            let urlSelect = overlay.querySelector('#linkURL1');
            let label1 = overlay.querySelector('#labelURL1');
            let url2 = overlay.querySelector('#linkURL2');
            let label2 = overlay.querySelector('#labelURL2');

            if (element.value == 'internal') {
                urlSelect.setAttribute('required', '');
                urlSelect.removeAttribute('style');
                urlSelect.removeAttribute('disabled');
                label1.removeAttribute('style');

                url2.removeAttribute('required');
                url2.setAttribute('disabled', '');
                url2.style.display = 'none';
                label2.style.display = 'none';
            }
            else {
                urlSelect.removeAttribute('required');
                urlSelect.setAttribute('disabled', '');
                urlSelect.style.display = 'none';
                label1.style.display= 'none';
                
                url2.setAttribute('required', '');
                url2.removeAttribute('disabled');
                url2.removeAttribute('style');
                label2.removeAttribute('style');

                if (element.value == 'external') {
                    label2.innerText = "URL:";
                    url2.type = "url";
                }
                else {
                    url2.type = 'text';
                    if (element.value == 'announcement') label2.innerText = "ID:";
                    else label2.innerText = "Path:";
                }
            }
        })
    })

    let form = overlay.querySelector('#linkForm');
        
    form.querySelector('.menuCancel').addEventListener('click', (event) => {
        window.prevent = false;
        document.body.removeChild(overlay);
    })

    window.prevent = true;
    return form;
}

async function editLink(item) {

    if (window.prevent) return;

    let position = [...document.querySelector('#sidebar2>ul').children].indexOf(item) + 1;
    let response = await getLink(position);
    if (!response) {
        alert("Error: No response from server");
        return;
    }
    if (response.status == 'error') {
        alert(response.error);
        return;
    }
    let link = response.link;

    let form = linkMenu('Edit Link',link.display_name, link.type, link.url, true);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        let obj = {
            position: position,
            changes: {
                title: data.get('title'),
                type: data.get('type'),
                url: data.get('url1') ?? data.get('url2')
            }
        };

        try {
            let response = await patchData('/links/', obj);
            if (response) {
                window.prevent = false;
                document.body.removeChild(overlay);
                // location.reload();

                item.querySelector('a').innerText = obj.changes.title;
                item.querySelector('a').href = response.extra.href;
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }
    })

    form.querySelector('.menuDelete').addEventListener('click', async (event) => {

        if (!window.confirm('Delete this link?\nThis action cannot be undone')) return;

        let obj = {position: position};

        try {
            let response = await deleteData('/links/', obj);
            if (response){
                window.prevent = false;
                document.body.removeChild(overlay);
                // location.reload();
                item.parentNode.removeChild(item);
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }

    })
}

async function addLink() {

    if (window.prevent) return;

    let form = linkMenu('Create New Link', 'New Link', 'external', '', false);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        let obj = {
            position: null,
            display_name: data.get('title'),
            type: data.get('type'),
            url: data.get('url1') ?? data.get('url2')
        };

        try {
            let response = await postData('/links/', obj);
            if (response) {
                window.prevent = false;
                document.body.removeChild(overlay);
                // location.reload();
                let newLink = document.createElement('li');
                newLink.classList.add('draggable-link');
                newLink.innerHTML = `
                <div class="link-drag-handle">
                    <div></div>
                    <div></div>
                </div>
                
                <a link-id="${response.extra.id}" href="${response.extra.href}">${obj.display_name}</a>
                
                <button class="edit-link" type="button" onclick="editLink(this.parentNode)">
                    <svg xmlns="http://www.w3.org/2000/svg" x="0" y="0" viewBox="0 0 400 400">
                        <g>
                            <path id="svg_6" d="m167.78745,30.3895c0,0 -68.70836,-0.74997 -72,-0.66667c-12.24984,0.04169 -30.66667,6.66667 -49.33334,23.33334c-18.66666,16.66666 -27.08334,39.4587 -27.33333,49.33333c-0.37499,17.87432 -1.33333,205.33333 -1.33333,205.33333c-0.62498,11.62456 8,34 26,50.66667c18,16.66667 46,22.66667 54.66666,22.66667c96,0 172.79159,-0.54175 192,-1.33334c19.20841,-0.79159 46.66666,-16.99999 58,-28.66666c11.33334,-11.66667 19.74985,-27.83362 19.87485,-36.04181c0.20834,-15.54152 0.79182,-83.95819 0.79182,-83.95819" opacity="NaN" stroke-width="31" fill="none"></path>
                            <g id="svg_14">
                                <path id="svg_8" d="m124.12078,272.3895c0,0 64.99519,-7.84425 64.99519,-7.84425c20.17092,-1.12061 170.33221,-171.45282 170.33221,-171.45282c0,0 43.70366,-34.73881 10.08546,-68.35701c-29.13577,-27.45486 -66.11579,16.2488 -66.11579,16.2488c0,0 -161.36736,159.12615 -161.92766,159.12615c-16.8091,12.32667 -17.3694,72.27913 -17.3694,72.27913z" opacity="NaN" stroke-width="30" fill="none"></path>
                                <path id="svg_9" d="m143.1711,193.94704c0,0 56.03033,61.63337 56.03033,61.63337" opacity="NaN" stroke-width="20" fill="none"></path>
                                <path id="svg_10" d="m309.02088,32.01937c0,0 56.03034,61.63336 56.03034,61.63336" opacity="NaN" stroke-width="20" fill="none"></path>
                            </g>
                        </g>
                    </svg>
                </button>`
                document.querySelector('#sidebar2>ul').insertBefore(newLink, document.querySelector('#sidebar2>ul>li:last-of-type'));
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }
    })

    window.prevent = true;
}

async function getLink(position) {
    try {
        const response = await fetch(`./link/${position}`, {
        headers: {
            'Content-Type': 'application/json', // Indicate JSON data
        }});

        if (!response.ok) {
            throw new Error(`${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json(); // Parse the response as JSON
        const obj = {
            'status': 'success',
            'link': responseData
        }
        return obj;
    } catch (error) {
        const obj = {
            'status': 'error',
            'error': error
        }
    }
}

async function patchData(url, data) {
    try {
        const response = await fetch(url, {
        method: 'PATCH', // Specify the method as POST
        headers: {
            'Content-Type': 'application/json', // Indicate JSON data
        },
        body: JSON.stringify(data), // Convert data to JSON string
        });

        if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json(); // Parse the response as JSON
        return responseData;
    } catch (error) {
        throw error; // Re-throw the error for further handling
    }
}

async function postData(url, data) {
    try {
        const response = await fetch(url, {
        method: 'POST', // Specify the method as POST
        headers: {
            'Content-Type': 'application/json', // Indicate JSON data
        },
        body: JSON.stringify(data), // Convert data to JSON string
        });

        if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json(); // Parse the response as JSON
        return responseData;
    } catch (error) {
        throw error; // Re-throw the error for further handling
    }
}

async function putData(url, data) {
    try {
        const response = await fetch(url, {
        method: 'PUT', // Specify the method as POST
        headers: {
            'Content-Type': 'application/json', // Indicate JSON data
        },
        body: JSON.stringify(data), // Convert data to JSON string
        });

        if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json(); // Parse the response as JSON
        return responseData;
    } catch (error) {
        throw error; // Re-throw the error for further handling
    }
}

async function deleteData(url, data) {
    try {
        const response = await fetch(url, {
        method: 'DELETE', // Specify the method as POST
        headers: {
            'Content-Type': 'application/json', // Indicate JSON data
        },
        body: JSON.stringify(data), // Convert data to JSON string
        });

        if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json(); // Parse the response as JSON
        return responseData;
    } catch (error) {
        throw error; // Re-throw the error for further handling
    }
}

function postLink(display_name, position, type, url) {
    // Example usage:

    const link = {
      display_name: display_name,
      position: position,
      type: type,
      url: url
    }
    
    postData('/links/', link);
}

function deleteLink(id) {
    deleteData('/links/', {id: id})
}

function postModule(display_name, position, hidden) {
    const module = {
        display_name: display_name,
        position: position,
        hidden: hidden
    }

    postData('/modules/', module);
}

function deleteModule(id) {
    deleteData('/modules/', {id: id})
}

function postFile(key, id, display_name) {
    const file = {
        key: key,
        id: id,
        display_name: display_name
    }

    postData('/files/', file)
}

function deleteFile(key) {
    deleteData('/files/', {key: key})
}

function postItem(module_id, position, display, type, url, hidden) {
  const item = {
    module_id: module_id,
    position: position,
    display:display,
    type:type,
    url:url,
    hidden:hidden
  }

  postData('/items/', item)
}

function deleteItem(id) {
  deleteData('/items/', {id:id})
}

function postMusic(key, url, display_name) {
  const music ={
    key: key,
    url: url,
    display_name: display_name
  }

  postData('/musicdata/', music)
}

function deleteMusic(key) {
  deleteData('/musicdata/', {key: key})
}

function postAnnouncement(author, title, date_posted, content) {
  const announcement = {
    author:author,
    title:title,
    date_posted:date_posted,
    content: content
  }

  postData('/announcements/', announcement)
}

function deleteAnnouncement(id) {
  deleteData('/announcements/', {id: id})
}