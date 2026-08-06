window.addEventListener('load', adminsetup);
windowPrevent(false);

function windowPrevent(bool) {
    window.prevent = bool
    document.querySelectorAll('.visibility-toggle').forEach((toggle) => {
        toggle.disabled = bool;
    })
}

function adminsetup() {
    linkDragAndDrop();
    itemDragAndDrop();
    moduleDragAndDrop();
}

function linkDragAndDrop() {
    let link_list = document.querySelector('#sidebar2>ul');
    let dragged_link = null;
    let spacer = null;
    link_list.addEventListener("pointerdown", (e) => {
        if (e.button == 0 && e.target.tagName == 'DIV') {
            e.preventDefault();

            if (window.prevent) return;
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
                            if (response && response.status == 'success') {
                                link_list.insertBefore(dragged_link, last_over);
                                // location.reload();
                            }
                            else {
                                alert(`Error: ${response.error}`)
                            }
                        }
                        catch (error) {
                            alert(`Server Error: ${error}`);
                        }
                    }
                    last_over.classList.remove('over');
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

async function linkMenu(title, display_name, type, url, hasDelete) {
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
                    <label id="labelURL1" for="linkURL1" ${(type != 'external')? '': 'style="display: none;" disabled'}>Name:</label>
                    <label id="labelURL2" for="linkURL2" ${(type != 'external')? 'style="display: none;" disabled': ''}>URL:</label>
                </div>
                <div>
                    <div class="scope">
                        <select class="big-select" id="linkURL1" name="url1" ${(type != 'external')? 'required': 'style="display: none;" disabled'}>
                        </select>
                    </div>
                    <input type="url" id="linkURL2" name="url2" placeholder="${url}" value="${url}" ${(type != 'external')? 'style="display: none;" disabled': 'required'}>
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
        element.addEventListener('pointerup', async (event) => {
            let urlSelect = overlay.querySelector('#linkURL1');
            let label1 = overlay.querySelector('#labelURL1');
            let url2 = overlay.querySelector('#linkURL2');
            let label2 = overlay.querySelector('#labelURL2');

            if (element.value != 'external') {
                urlSelect.setAttribute('required', '');
                urlSelect.removeAttribute('style');
                urlSelect.removeAttribute('disabled');
                label1.removeAttribute('style');

                url2.removeAttribute('required');
                url2.setAttribute('disabled', '');
                url2.style.display = 'none';
                label2.style.display = 'none';

                let response = await getOptions(element.value);
                let newoptions = '';
                response.options.forEach((obj) => {
                    newoptions = newoptions + `\n<option value="${obj.id ?? obj.key}">${obj.title ?? obj.display_name}</option>`
                })

                urlSelect.innerHTML = newoptions;
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
            }
        })
    })

    let form = overlay.querySelector('#linkForm');
        
    form.querySelector('.menuCancel').addEventListener('click', (event) => {
        windowPrevent(false);
        document.body.removeChild(overlay);
    })

    if (type != 'external') {
        let response = await getOptions(type);
        let newoptions = '';
        response.options.forEach((obj) => {
            newoptions = newoptions + `\n<option value="${obj.id ?? obj.key}" ${(url == (obj.id ?? obj.key))? 'selected=""': ''}>${obj.title ?? obj.display_name}</option>`
        })
    
        form.querySelector('#linkURL1').innerHTML = newoptions;
    }

    windowPrevent(true);
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

    let form = await linkMenu('Edit Link',link.display_name, link.type, link.url, true);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        let obj = {
            position: position,
            changes: {
                title: data.get('title').trim(),
                type: data.get('type').trim(),
                url: data.get('url1').trim() ?? data.get('url2').trim()
            }
        };

        try {
            let response = await patchData('/links/', obj);
            if (response && response.status == 'success') {
                windowPrevent(false);
                document.body.removeChild(overlay);
                // location.reload();

                item.querySelector('a').innerText = obj.changes.title;
                item.querySelector('a').href = response.extra.href;
            }
            else {
                alert(`Error: ${response.error}`)
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
            if (response && response.status == 'success'){
                windowPrevent(false);
                document.body.removeChild(overlay);
                // location.reload();
                item.parentNode.removeChild(item);
            }
            else {
                alert(`Error: ${response.error}`)
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }

    })
}

async function addLink() {

    if (window.prevent) return;

    let form = await linkMenu('Create New Link', 'New Link', 'external', '', false);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        let obj = {
            position: null,
            display_name: data.get('title').trim(),
            type: data.get('type').trim(),
            url: data.get('url1').trim() ?? data.get('url2').trim()
        };

        try {
            let response = await postData('/links/', obj);
            if (response && response.status == 'success') {
                windowPrevent(false);
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
            else {
                alert(`Error: ${response.error}`);
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }
    })

    windowPrevent(true);
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

function itemDragAndDrop() {
    let item_lists = [...document.querySelectorAll('.module-items')];
    let dragged_item = null;
    let spacer = null;
    item_lists.forEach( (item_list) => {

        if(item_list.hasListener) return;

        item_list.addEventListener("pointerdown", (e) => {
        if (e.button == 0 && e.target.tagName == 'DIV') {
            e.preventDefault();

            if (window.prevent) return;

            dragged_item = getItemListTarget(e.target);

            if (dragged_item.classList.contains('add-item')) {
                dragged_item = null;
                return;
            }

            let position1 = [...item_list.querySelectorAll('.draggable-item')].indexOf(dragged_item) + 1;

            spacer = document.createElement('LI');
            spacer.style.height = dragged_item.getBoundingClientRect().height - 2;
            spacer.classList.add('spacer');
            let spaceInserted = false;

            // let pos2 = e.clientY;
            let offset = e.clientY - dragged_item.getBoundingClientRect().top;

            document.addEventListener("touchmove", preventTouchScroll, {passive: false});
            
            document.onpointermove = (e2) => {
                e2.preventDefault();
                if (!dragged_item.classList.contains("dragging")) {
                    dragged_item.style.width = dragged_item.getBoundingClientRect().width;
                    dragged_item.classList.add("dragging");
                }
                
                // let pos1 = pos2 - e2.clientY;
                // dragged_link.style.top = Math.min(Math.max(link_list.offsetTop, dragged_link.offsetTop - pos1), link_list.lastElementChild.offsetTop);
                // if (link_list.offsetTop <= dragged_link.offsetTop - pos1 && dragged_link.offsetTop - pos1 <= link_list.lastElementChild.offsetTop) {
                //     pos2 = e2.clientY;

                // }
                dragged_item.style.top = Math.min(Math.max(item_list.parentElement.offsetTop, e2.clientY - offset + item_list.offsetTop - item_list.getBoundingClientRect().top), item_list.lastElementChild.offsetTop - dragged_item.offsetHeight);
                if (!spaceInserted) {
                    item_list.insertBefore(spacer, dragged_item);
                    spaceInserted = true;
                }

                let draggables = [...item_list.querySelectorAll('li.draggable-item:not(.dragging)')];
                let closestItem = null;
                let closestOffset = Number.NEGATIVE_INFINITY;

                for (let i = 0; i < draggables.length; i++) {
                    let box = draggables[i].getBoundingClientRect();
                    let offset = e2.clientY - box.top - box.height / 2;
                    if (offset < 0 && offset > closestOffset) {
                        closestItem = draggables[i].previousElementSibling;
                        closestOffset = offset;
                    }
                }

                let last_over = item_list.querySelector('li.over');

                if (closestItem) {
                    if (last_over && last_over != closestItem) {
                        last_over.classList.remove('over');
                        closestItem.classList.add('over');
                    }
                    else if (!last_over) {
                        closestItem.classList.add('over');
                    }
                    // link_list.insertBefore(dragged_link, closestLink);
                }
                else {
                    if (last_over && last_over != item_list.lastElementChild) {
                        last_over.classList.remove('over');
                        item_list.lastElementChild.classList.add('over');
                    }
                    if (!last_over) {
                        item_list.lastElementChild.classList.add('over');
                    }
                    // link_list.appendChild(dragged_link);
                }
            }

            document.onpointerup = async (e2) => {
                e2.preventDefault();
                document.onpointermove = null;
                document.onpointerup = null;
                document.removeEventListener("touchmove", preventTouchScroll,{passive: false});
                dragged_item.classList.remove("dragging");
                dragged_item.removeAttribute("style");

                let last_over = item_list.querySelector('li.over');
                if (last_over) {
                    let position2 = [...item_list.querySelectorAll('li.add-item')].indexOf(last_over) + 1;
                    if (position2 > position1) position2--;

                    if (position2 != position1) {
                        let obj = {
                            moduleposition: getModulePos(dragged_item),
                            position: position1,
                            position2: position2
                        };

                        try {
                            let response = await putData('/items/', obj);
                            if (response && response.status == 'success') {
                                // location.reload();
                                let afterButton = dragged_item.nextElementSibling;
                                item_list.insertBefore(afterButton, last_over);
                                item_list.insertBefore(dragged_item, last_over);
                            }
                            else {
                                alert(`Error: ${response.error}`)
                            }
                        }
                        catch (error) {
                            alert(`Server Error: ${error}`);
                        }
                    }
                    last_over.classList.remove('over');
                }
                
            
                dragged_item = null;
                if (spaceInserted) item_list.removeChild(spacer);
            }
        }
            // getLinkListTarget(e.target).setAttribute('draggable', true);
        item_list.hasListener = true;
    });});
}

function getItemListTarget(element) {
    const classlist = element.classList;
    if (classlist.contains('draggable-item')) return element;
    else if (classlist.contains('item-drag-handle') || classlist.contains('edit-item') || ['A', 'SPAN', 'H3', 'INPUT'].includes(element.tagName)) return element.parentNode;
    else return element.parentNode.parentNode;
}

function getModulePos(item) {
    let modulelist = [...document.getElementById('modules').querySelectorAll('div.module')];
    return modulelist.indexOf(item.parentElement.parentElement.parentElement) + 1;
}

/**
 * 
 * @param {HTMLElement} item 
 */
async function toggleItemVisibility(item) {

    if (window.prevent) return;

    let obj = {
        moduleposition: getModulePos(item.parentElement),
        position: [...item.parentElement.parentElement.querySelectorAll('.draggable-item')].indexOf(item.parentElement) + 1,
        changes: {
            hidden: item.checked
        }
    };

    try {
        let response = await patchData('/items/', obj);
        if (response && response.status == 'success') {
            item.parentElement.classList.toggle('hidden-item', item.checked);
        }
        else {
            alert(`Error: ${response.error}`)
        }
    }
    catch (error) {
        alert(`Server Error: ${error}`);
    }
}

async function itemMenu(title, display_name, type, url, hasDelete) {
    let overlay = document.createElement("div");
    overlay.id = 'overlay';
    overlay.innerHTML = `
    <div class="dialog">
        <h3>${title}</h3>
        <div class="menu">
            <form id="itemForm">
                <label for="itemTitle">Title:</label><br>
                <input type="text" id="itemTitle" name="title" placeholder="${display_name}" value="${display_name}" required><br><br><br>
                <label for="itemType">Type:</label><br>
                <div class="scope">
                    <select id="itemType" name="type" required>
                        <option value="header"${(type == 'header')? ' selected=""': ''}>Header</option>
                        <option value="link"${(type == 'link')? ' selected=""': ''}>Link</option>
                        <option value="page"${(type == 'page')? ' selected=""': ''}>Page</option>
                        <option value="announcement"${(type == 'announcement')? ' selected=""': ''}>Announcement</option>
                        <option value="file"${(type == 'file')? ' selected=""': ''}>File</option>
                        <option value="music"${(type == 'music')? ' selected=""': ''}>Music</option>
                    </select>
                </div><br><br>
                <div>
                    <label id="labelURL1" for="itemURL1" ${(type != 'header' && type != 'link')? '': 'style="display: none;" disabled'}>Name:</label>
                    <label id="labelURL2" for="itemURL2" ${(type != 'link')? 'style="display: none;" disabled': ''}>URL:</label>
                </div>
                <div>
                    <div class="scope">
                        <select class="big-select" id="itemURL1" name="url1" ${(type != 'header' && type != 'link')? 'required': 'style="display: none;" disabled'}>
                        </select>
                    </div>
                    <input type="url" id="itemURL2" name="url2" placeholder="${url}" value="${url}" ${(type != 'link')? 'style="display: none;" disabled': 'required'}>
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

    overlay.querySelectorAll('#itemType > option').forEach((element) => {
        element.addEventListener('pointerup', async (event) => {
            let urlSelect = overlay.querySelector('#itemURL1');
            let label1 = overlay.querySelector('#labelURL1');
            let url2 = overlay.querySelector('#itemURL2');
            let label2 = overlay.querySelector('#labelURL2');

            if (element.value != 'header' && element.value != 'link') {
                urlSelect.setAttribute('required', '');
                urlSelect.removeAttribute('style');
                urlSelect.removeAttribute('disabled');
                label1.removeAttribute('style');

                url2.removeAttribute('required');
                url2.setAttribute('disabled', '');
                url2.style.display = 'none';
                label2.style.display = 'none';

                let response = await getOptions(element.value);
                let newoptions = '';
                response.options.forEach((obj) => {
                    newoptions = newoptions + `\n<option value="${obj.id ?? obj.key}">${obj.title ?? obj.display_name}</option>`
                })

                urlSelect.innerHTML = newoptions;
            }
            else {
                urlSelect.removeAttribute('required');
                urlSelect.setAttribute('disabled', '');
                urlSelect.style.display = 'none';
                label1.style.display= 'none';
                
                if (element.value == 'link') {
                    url2.setAttribute('required', '');
                    url2.removeAttribute('disabled');
                    url2.removeAttribute('style');
                    label2.removeAttribute('style');
                }
                else {
                    url2.removeAttribute('required');
                    url2.setAttribute('disabled', '');
                    url2.style.display = 'none';
                    label2.style.display = 'none';
                }
            }
        })
    })

    let form = overlay.querySelector('#itemForm');
        
    form.querySelector('.menuCancel').addEventListener('click', (event) => {
        windowPrevent(false);
        document.body.removeChild(overlay);
    })

    if (type != 'header' && type != 'link') {
        let response = await getOptions(type);
        let newoptions = '';
        response.options.forEach((obj) => {
            newoptions = newoptions + `\n<option value="${obj.id ?? obj.key}" ${(url == (obj.id ?? obj.key))? 'selected=""': ''}>${obj.title ?? obj.display_name}</option>`
        })
    
        form.querySelector('#itemURL1').innerHTML = newoptions;
    }

    windowPrevent(true);
    return form;
}

/**
 * 
 * @param {HTMLElement} listitem 
 * @returns 
 */
async function editItem(listitem) {

    if (window.prevent) return;

    let modulepos = getModulePos(listitem);
    let position = [...listitem.parentElement.querySelectorAll('.draggable-item')].indexOf(listitem) + 1;
    let response = await getItem(modulepos, position);
    if (!response) {
        alert("Error: No response from server");
        return;
    }
    if (response.status == 'error') {
        alert(response.error);
        return;
    }
    let item = response.item;

    let form = await itemMenu('Edit Item', item.display, item.type, item.url, true);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        let obj = {
            moduleposition: modulepos,
            position: position,
            changes: {
                display_name: data.get('title').trim(),
                type: data.get('type').trim(),
                url: data.get('url1').trim() ?? data.get('url2').trim()
            }
        };

        try {
            let response = await patchData('/items/', obj);
            if (response && response.status == 'success') {
                windowPrevent(false);
                document.body.removeChild(overlay);
                // location.reload();

                listitem.classList.remove('module-header', 'module-link', 'module-page', 'module-announcement', 'module-music', 'module-file');
                listitem.classList.add(`module-${obj.changes.type}`)

                listitem.removeChild(listitem.querySelector('a') ?? listitem.querySelector('h3'))
                let newelement = document.createElement((obj.changes.type == 'header')? 'h3': 'a');
                newelement.innerText = obj.changes.display_name;
                if (obj.changes.type != 'header') newelement.href = response.extra.href;
                listitem.insertBefore(newelement, listitem.querySelector('.visibility-toggle'));
            }
            else {
                alert(`Error: ${response.error}`)
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }
    })

    form.querySelector('.menuDelete').addEventListener('click', async (event) => {

        if (!window.confirm('Delete this item?\nThis action cannot be undone')) return;

        let obj = {moduleposition: modulepos, position: position};

        try {
            let response = await deleteData('/items/', obj);
            if (response && response.status == 'success'){
                windowPrevent(false);
                document.body.removeChild(overlay);
                // location.reload();
                listitem.parentNode.removeChild(listitem.previousElementSibling);
                listitem.parentNode.removeChild(listitem);
            }
            else {
                alert(`Error: ${response.error}`)
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }

    })
}

/**
 * 
 * @param {HTMLElement} item 
 * @returns 
 */
async function addItem(item) {

    if (window.prevent) return;

    let buttons = [...item.parentElement.querySelectorAll('.add-item')];

    let modulepos = getModulePos(item);
    let position = buttons.indexOf(item) + 1;

    let form = await itemMenu(`${(position < buttons.length)? 'Insert': 'Add'} New Item`, 'New Item', 'header', '', false);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        let obj = {
            moduleposition: modulepos,
            position: position,
            display: data.get('title').trim(),
            type: data.get('type').trim(),
            url: data.get('url1').trim() ?? data.get('url2').trim(),
            hidden: false
        };

        try {
            let response = await postData('/items/', obj);
            if (response && response.status == 'success') {
                windowPrevent(false);
                document.body.removeChild(overlay);
                // location.reload();
                let newItem = document.createElement('li');
                newItem.classList.add('draggable-item',`module-${obj.type}`);
                newItem.innerHTML = `
                <div class="item-drag-handle">
                    <div></div>
                    <div></div>
                </div>
                <span></span>
                ${(obj.type == 'header')? `<h3>${obj.display}</h3>` : `<a href="${response.extra.href}">${obj.display}</a>`}
                <input type="checkbox" class="visibility-toggle" onclick="toggleItemVisibility(this)">      
                <button class="edit-item" type="button" onclick="editItem(this.parentNode)">
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
                </button>`;

                let newButton = document.createElement('li');
                newButton.classList.add('add-item');
                newButton.innerHTML = `<button onclick="addItem(this.parentNode)"><div></div>+<div></div></button>`;

                item.parentElement.insertBefore(newButton, item);
                item.parentElement.insertBefore(newItem, item);
            }
            else {
                alert(`Error: ${response.error}`)
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }
    })

    windowPrevent(true);
}

function getModuleTarget(target) {
    if (target.classList.contains('module-drag-handle')) return target.parentElement.parentElement.parentElement;
    return target.parentElement.parentElement.parentElement.parentElement;
}

function moduleDragAndDrop() {
    let handles = [...document.querySelectorAll('.module-drag-handle')];
    let dragged_module = null;
    let spacer = null;
    handles.forEach( (handle) => {

        if(handle.hasListener) return;

        handle.addEventListener("pointerdown", (e) => {
        if (e.button == 0) {
            e.preventDefault();

            if (window.prevent) return;

            dragged_module = getModuleTarget(e.target);

            let position1 = [...document.querySelectorAll('.draggable-module')].indexOf(dragged_module) + 1;
            
            let offset = e.clientY - dragged_module.getBoundingClientRect().top;
            console.log(offset);
            
            let opened = [];

            document.querySelectorAll('.module details').forEach((element, index) => {
                if (element.open) opened.push(element.parentElement.getAttribute('module-id'));
                element.classList.add('disabled');
                element.removeAttribute('open');
                element.querySelector('summary').tabIndex = -1;
            })

            document.querySelectorAll('.add-module').forEach((element) => {
                element.style.display = 'none';
            })

            spacer = document.createElement('div');
            spacer.style.height = dragged_module.getBoundingClientRect().height - 2;
            spacer.classList.add('spacer');
            let spaceInserted = false;

            let extraspace = document.createElement('div');
            extraspace.style.height = document.documentElement.clientHeight;
            extraspace.style.width = 10;
            extraspace.id = 'extra-space';
            document.getElementById('big-wrapper').appendChild(extraspace);

            dragged_module.scrollIntoView({behavior: 'instant', block: 'start'});
            window.scrollBy(0, offset - e.clientY);

            // let pos2 = e.clientY;

            document.addEventListener("touchmove", preventTouchScroll, {passive: false});
            
            document.onpointermove = (e2) => {
                e2.preventDefault();
                if (!dragged_module.classList.contains("dragging")) {
                    dragged_module.style.width = dragged_module.getBoundingClientRect().width;
                    dragged_module.classList.add("dragging");
                }
                
                // let pos1 = pos2 - e2.clientY;
                // dragged_link.style.top = Math.min(Math.max(link_list.offsetTop, dragged_link.offsetTop - pos1), link_list.lastElementChild.offsetTop);
                // if (link_list.offsetTop <= dragged_link.offsetTop - pos1 && dragged_link.offsetTop - pos1 <= link_list.lastElementChild.offsetTop) {
                //     pos2 = e2.clientY;

                // }

                let module_list = document.getElementById('modules');

                let mobileOffset = (isMobile.matches)? 72: 0;
                console.log(mobileOffset);

                dragged_module.style.top = Math.min(Math.max(module_list.offsetTop + 50, e2.clientY - offset + mobileOffset - document.getElementById('main').getBoundingClientRect().top), module_list.lastElementChild.offsetTop);

                if (!spaceInserted) {
                    module_list.insertBefore(spacer, dragged_module);
                    spaceInserted = true;
                }

                let draggables = [...document.querySelectorAll('.draggable-module:not(.dragging)')];
                let closestModule = null;
                let closestOffset = Number.NEGATIVE_INFINITY;

                for (let i = 0; i < draggables.length; i++) {
                    let box = draggables[i].getBoundingClientRect();
                    let offset = e2.clientY - box.top - box.height / 2;
                    if (offset < 0 && offset > closestOffset) {
                        closestModule = draggables[i];
                        closestOffset = offset;
                    }
                }

                let last_over = module_list.querySelector('div.over');

                if (closestModule) {
                    if (last_over && last_over != closestModule) {
                        last_over.classList.remove('over');
                        closestModule.classList.add('over');
                    }
                    else if (!last_over) {
                        closestModule.classList.add('over');
                    }
                    // link_list.insertBefore(dragged_link, closestLink);
                }
                else {
                    if (last_over && last_over != module_list.lastElementChild) {
                        last_over.classList.remove('over');
                        module_list.lastElementChild.classList.add('over');
                    }
                    if (!last_over) {
                        module_list.lastElementChild.classList.add('over');
                    }
                    // link_list.appendChild(dragged_link);
                }
            }

            document.onpointerup = async (e2) => {
                e2.preventDefault();
                document.onpointermove = null;
                document.onpointerup = null;
                document.removeEventListener("touchmove", preventTouchScroll,{passive: false});
                dragged_module.classList.remove("dragging");
                dragged_module.removeAttribute("style");

                let module_list = document.getElementById('modules');

                let last_over = module_list.querySelector('div.over');
                if (last_over) {
                    let position2 = [...module_list.querySelectorAll(':scope > div:not(.spacer)')].indexOf(last_over) + 1;
                    if (position2 > position1) position2--;

                    if (position2 != position1) {
                        let obj = {
                            position: position1,
                            position2: position2
                        };

                        try {
                            let response = await putData('/modules/', obj);
                            if (response && response.status == 'success') {
                                // location.reload();
                                let afterButton = dragged_module.nextElementSibling;
                                module_list.insertBefore(dragged_module, last_over);
                                module_list.insertBefore(afterButton, last_over);
                            }
                            else {
                                alert(`Error: ${response.error}`)
                            }
                        }
                        catch (error) {
                            alert(`Server Error: ${error}`);
                        }
                    }
                    last_over.classList.remove('over');
                }
                
                
                document.querySelectorAll('.module details').forEach((element) => {
                    element.classList.remove('disabled');
                    element.querySelector('summary').removeAttribute('tabIndex');
                })

                opened.forEach((value) => {
                    document.querySelector(`.module[module-id="${value}"] details`).setAttribute('open','')
                })

                document.querySelectorAll('.add-module').forEach((element) => {
                    element.removeAttribute('style');
                })

                document.getElementById('big-wrapper').removeChild(document.getElementById('extra-space'));
                
                if (dragged_module.offsetTop + dragged_module.offsetParent.offsetTop <= document.documentElement.scrollHeight - document.documentElement.clientHeight) {
                    dragged_module.scrollIntoView({behavior: 'instant', block: 'start'});
                    window.scrollBy(0, offset - e2.clientY);
                }
                else {
                    dragged_module.scrollIntoView({behavior: 'instant', block: 'end'});
                    window.scrollBy(0, document.documentElement.clientHeight - e2.clientY + offset - dragged_module.clientHeight);
                }

                dragged_module = null;
                if (spaceInserted) module_list.removeChild(spacer);
            }
        }
            // getLinkListTarget(e.target).setAttribute('draggable', true);
        handle.hasListener = true;
    });});
}

function editModule(item) {

    if (window.prevent) return;

    let position = getModulePos(item);

    let module = [...document.querySelectorAll('div.module')][position - 1];

    let title = module.querySelector('summary').innerText;

    let moduleButtons = module.querySelector('.module-buttons');

    let form = document.createElement('form');
    form.classList.add('module-editor')
    form.innerHTML = `<input type="text" name="title" placeholder="${title}" value="${title}" required>
    <input type="submit" value="✓">
    <button type="button">🗙</button>`;

    form.querySelector('button').addEventListener('click', (event) => {
        moduleButtons.removeChild(form);
        windowPrevent(false);
    })

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        let obj = {
            position: position,
            changes: {
                display_name: data.get('title').trim()
            }
        };

        try {
            let response = await patchData('/modules/', obj);
            if (response && response.status == 'success') {
                module.querySelector('summary').innerText = obj.changes.display_name;
                moduleButtons.removeChild(form);
                windowPrevent(false);
            }
            else {
                alert(`Error: ${response.error}`)
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }
    })

    moduleButtons.appendChild(form);

    windowPrevent(true);
}

async function toggleModuleVisibility(item) {

    if (window.prevent) return;

    let position = [...document.querySelectorAll('div.module')].indexOf(item.parentElement.parentElement) + 1;

    let obj = {
        position: position,
        changes: {
            hidden: item.checked
        }
    };

    try {
        let response = await patchData('/modules/', obj);
        if (response && response.status == 'success') {
            item.parentElement.parentElement.classList.toggle('hidden-module', item.checked);
        }
        else {
            alert(`Error: ${response.error}`)
        }
    }
    catch (error) {
        alert(`Server Error: ${error}`);
    }
}

async function delModule(item) {

    if (window.prevent) return;

    if (!window.confirm('Delete this Module?\nAll internal items will be lost.\nThis action cannot be undone.')) return;

    let position = [...document.querySelectorAll('div.module')].indexOf(item.parentElement.parentElement) + 1;

    let obj = {position: position};

    try {
        let response = await deleteData('/modules/', obj);
        if (response && response.status == 'success') {
            item.parentElement.parentElement.parentElement.removeChild(item.parentElement.parentElement.previousElementSibling);
            item.parentElement.parentElement.parentElement.removeChild(item.parentElement.parentElement);
        }
        else {
            alert(`Error: ${response.error}`)
        }
    }
    catch (error) {
        alert(`Server Error: ${error}`);
    }
}

function addModule(item) {

    if(window.prevent) return;

    let position = [...document.querySelectorAll('.add-module')].indexOf(item) + 1;

    let newModule = document.createElement('div');
    newModule.classList.add('module', 'draggable-module');
    newModule.innerHTML = `
    <div class="module-buttons">
        <div class="module-top-bar">
            <div class="module-drag-handle">
                <div></div><div></div><div></div><div></div><div></div><div></div>
            </div>
        </div>
        <button class="edit-module" type="button" onclick="editModule(this.firstElementChild)">
            <svg xmlns="http://www.w3.org/2000/svg" x="0" y="0" viewBox="0 0 400 400">
                <g>
                    <path id="svg_6" d="m167.78745,30.3895c0,0 -68.70836,-0.74997 -72,-0.66667c-12.24984,0.04169 -30.66667,6.66667 -49.33334,23.33334c-18.66666,16.66666 -27.08334,39.4587 -27.33333,49.33333c-0.37499,17.87432 -1.33333,205.33333 -1.33333,205.33333c-0.62498,11.62456 8,34 26,50.66667c18,16.66667 46,22.66667 54.66666,22.66667c96,0 172.79159,-0.54175 192,-1.33334c19.20841,-0.79159 46.66666,-16.99999 58,-28.66666c11.33334,-11.66667 19.74985,-27.83362 19.87485,-36.04181c0.20834,-15.54152 0.79182,-83.95819 0.79182,-83.95819" opacity="NaN" stroke-width="31" fill="none"/>
                    <g id="svg_14">
                        <path id="svg_8" d="m124.12078,272.3895c0,0 64.99519,-7.84425 64.99519,-7.84425c20.17092,-1.12061 170.33221,-171.45282 170.33221,-171.45282c0,0 43.70366,-34.73881 10.08546,-68.35701c-29.13577,-27.45486 -66.11579,16.2488 -66.11579,16.2488c0,0 -161.36736,159.12615 -161.92766,159.12615c-16.8091,12.32667 -17.3694,72.27913 -17.3694,72.27913z" opacity="NaN" stroke-width="30" fill="none"/>
                        <path id="svg_9" d="m143.1711,193.94704c0,0 56.03033,61.63337 56.03033,61.63337" opacity="NaN" stroke-width="20" fill="none"/>
                        <path id="svg_10" d="m309.02088,32.01937c0,0 56.03034,61.63336 56.03034,61.63336" opacity="NaN" stroke-width="20" fill="none"/>
                    </g>
                </g>
            </svg>
        </button>
        <input type="checkbox" class="visibility-toggle" {% if module.hidden %} checked {% endif %} onclick="toggleModuleVisibility(this)">
        <button class="delete-module" onclick="delModule(this)"></button>
        <form class="module-adder">
            <input type="text" name="title" placeholder="New Module" value="" required>
            <input type="submit" value="✓">
            <button type="button">🗙</button>
        </form>
    </div>
    <details class="disabled">
        <summary tabindex="-1">.</summary>
    </details>`;

    let newButton = document.createElement('button');
    newButton.classList.add('add-module');
    newButton.innerText = '+';
    newButton.setAttribute('onclick', 'addModule(this)');

    document.getElementById('modules').insertBefore(newButton, item);
    document.getElementById('modules').insertBefore(newModule, item);

    let input = newModule.querySelector('.module-adder input[type="text"]');
    input.scrollIntoView({behavior: 'smooth', block: 'center'})
    input.focus();

    let form = newModule.querySelector('.module-adder');

    form.querySelector('button').addEventListener('click', (event) => {
        newModule.parentElement.removeChild(newModule);
        newButton.parentElement.removeChild(newButton);
        windowPrevent(false);
    })

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        let obj = {
            position: position,
            display_name: data.get('title').trim(),
            hidden: false
        };

        try {
            let response = await postData('/modules/', obj);
            if (response && response.status == 'success') {
                newModule.querySelector('summary').innerText = obj.display_name;
                newModule.querySelector('summary').removeAttribute('tabindex');
                newModule.querySelector('details').removeAttribute('class');

                let newItems = document.createElement('ul');
                newItems.classList.add('module-items');
                newItems.innerHTML = `<li class="add-item"><button onclick="addItem(this.parentNode)"><div></div>+<div></div></button></li>`;

                newModule.querySelector('details').appendChild(newItems);
                newModule.querySelector('details').setAttribute('open', '');

                form.parentElement.removeChild(form);
                windowPrevent(false);
                itemDragAndDrop();
                moduleDragAndDrop();
            }
            else {
                alert(`Error: ${response.error}`)
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }
    })

    windowPrevent(true);
}

async function fileMenu(title, type, display_name, key, url, hasDelete) {
    let urlLabel = "Drive";
    if (type == 'music')
        urlLabel = "MuseScore";
    let overlay = document.createElement("div");
    overlay.id = 'overlay';
    overlay.innerHTML = `
    <div class="dialog">
        <h3>${title}</h3>
        <div class="menu">
            <form id="fileForm">
                <label for="fileTitle">Title:</label><br>
                <input type="text" id="fileTitle" name="title" placeholder="${display_name}" value="${display_name}" required>
                <br><br><br>
                <label for="fileKey">Glanvas URL:</label>
                <input type="text" id="fileKey" name="key" placeholder="${key}" value="${key}" required>
                <br><br><br>
                <label for="fileURL">${urlLabel} URL:</label>
                <input type="url" id="fileURL" name="url" placeholder="${url}" value="${url}" required>
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

    let form = overlay.querySelector('#fileForm');
        
    form.querySelector('.menuCancel').addEventListener('click', (event) => {
        windowPrevent(false);
        document.body.removeChild(overlay);
    })

    windowPrevent(true);
    return form;
}

/**
 * 
 * @param {HTMLElement} tablerow 
 * @returns 
 */
async function editFile(tablerow) {

    if (window.prevent) return;

    let response = await getFile(tablerow.key);
    if (!response) {
        alert("Error: No response from server");
        return;
    }
    if (response.status == 'error') {
        alert(response.error);
        return;
    }
    let file = response.file;

    let form = await fileMenu('Edit File', 'file', file.display_name, file.key, file.url, true);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        let obj = {
            key: tablerow.key,
            changes: {
                display_name: data.get('title').trim(),
                path: data.get('key').trim(),
                url: data.get('url').trim()
            }
        };

        try {
            let response = await patchData('/files/', obj);
            if (response && response.status == 'success') {
                windowPrevent(false);
                document.body.removeChild(overlay);
                // location.reload();

                let link = tablerow.querySelector('td.title a');
                link.innerText = obj.changes.display_name;
                link.href = response.extra.href;

                tablerow.querySelector('td.key').innerText = obj.changes.path;
                tablerow.querySelector('td.key').title = obj.changes.path;
                tablerow.querySelector('td.url').innerText = obj.changes.url;
                tablerow.querySelector('td.url').title = obj.changes.url;
                tablerow.key = obj.changes.path;
                tablerow.dataset.key = obj.changes.path;
                tablerow.display = obj.changes.display_name;
                tablerow.dataset.display = obj.changes.display_name;
                alphabetizeTable(tablerow.parentElement, tablerow.parentElement.removeChild(tablerow));
                tablerow.scrollIntoView({block: "center"});
            }
            else {
                alert(`Error: ${response.error}`)
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }
    })

    form.querySelector('.menuDelete').addEventListener('click', async (event) => {

        if (!window.confirm('Delete this file?\nThis action cannot be undone')) return;

        let obj = {key: tablerow.key};

        try {
            let response = await deleteData('/files/', obj);
            if (response && response.status == 'success'){
                windowPrevent(false);
                document.body.removeChild(overlay);
                // location.reload();
                tablerow.parentNode.removeChild(tablerow);
            }
            else {
                alert(`Error: ${response.error}`)
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }

    })
}

async function addFile() {

    if (window.prevent) return;

    let form = await fileMenu('Add New File', 'file', 'New File', '', '', false);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        let obj = {
            key: data.get('key').trim(),
            display_name: data.get('title').trim(),
            url: data.get('url').trim()
        };

        try {
            let response = await postData('/files/', obj);
            if (response && response.status == 'success') {
                windowPrevent(false);
                document.body.removeChild(overlay);
                // location.reload();
                let newFile = document.createElement('tr');
                newFile.key = obj.key;
                newFile.dataset.key = obj.key;
                newFile.display = obj.display_name;
                newFile.dataset.display = obj.display_name;
                newFile.innerHTML = `
                <td class="title">
                    <a href="${response.extra.href}" target="_blank"> ${obj.display_name}</a>
                </td>
                <td class="key" title="${obj.key}">${obj.key}</td>
                <td class="url" title="${obj.url}">${obj.url}</td>
                <td class="button">
                    <button class="table-edit-button" type="button" onclick="editFile(this.parentNode.parentNode)">
                        <svg xmlns="http://www.w3.org/2000/svg" x="0" y="0" viewBox="0 0 400 400">
                            <g>
                                <path id="svg_6" d="m167.78745,30.3895c0,0 -68.70836,-0.74997 -72,-0.66667c-12.24984,0.04169 -30.66667,6.66667 -49.33334,23.33334c-18.66666,16.66666 -27.08334,39.4587 -27.33333,49.33333c-0.37499,17.87432 -1.33333,205.33333 -1.33333,205.33333c-0.62498,11.62456 8,34 26,50.66667c18,16.66667 46,22.66667 54.66666,22.66667c96,0 172.79159,-0.54175 192,-1.33334c19.20841,-0.79159 46.66666,-16.99999 58,-28.66666c11.33334,-11.66667 19.74985,-27.83362 19.87485,-36.04181c0.20834,-15.54152 0.79182,-83.95819 0.79182,-83.95819" opacity="NaN" stroke-width="31" fill="none"/>
                                <g id="svg_14">
                                    <path id="svg_8" d="m124.12078,272.3895c0,0 64.99519,-7.84425 64.99519,-7.84425c20.17092,-1.12061 170.33221,-171.45282 170.33221,-171.45282c0,0 43.70366,-34.73881 10.08546,-68.35701c-29.13577,-27.45486 -66.11579,16.2488 -66.11579,16.2488c0,0 -161.36736,159.12615 -161.92766,159.12615c-16.8091,12.32667 -17.3694,72.27913 -17.3694,72.27913z" opacity="NaN" stroke-width="30" fill="none"/>
                                    <path id="svg_9" d="m143.1711,193.94704c0,0 56.03033,61.63337 56.03033,61.63337" opacity="NaN" stroke-width="20" fill="none"/>
                                    <path id="svg_10" d="m309.02088,32.01937c0,0 56.03034,61.63336 56.03034,61.63336" opacity="NaN" stroke-width="20" fill="none"/>
                                </g>
                            </g>
                        </svg>
                    </button>
                </td>`;

                alphabetizeTable(document.getElementById('files').querySelector('tbody'), newFile);
                newFile.scrollIntoView({block: "center"});
            }
            else {
                alert(`Error: ${response.error}`)
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }
    })

    windowPrevent(true);
}

/**
 * 
 * @param {HTMLElement} tablerow 
 * @returns 
 */
async function editMusic(tablerow) {

    if (window.prevent) return;

    let response = await getMusic(tablerow.key);
    if (!response) {
        alert("Error: No response from server");
        return;
    }
    if (response.status == 'error') {
        alert(response.error);
        return;
    }
    let music = response.music;

    let form = await fileMenu('Edit Music', 'music', music.display_name, music.key, music.url, true);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        let obj = {
            key: tablerow.key,
            changes: {
                display_name: data.get('title').trim(),
                path: data.get('key').trim(),
                url: data.get('url').trim()
            }
        };

        try {
            let response = await patchData('/musicdata/', obj);
            if (response && response.status == 'success') {
                windowPrevent(false);
                document.body.removeChild(overlay);
                // location.reload();

                let link = tablerow.querySelector('td.title a');
                link.innerText = obj.changes.display_name;
                link.href = response.extra.href;

                tablerow.querySelector('td.key').innerText = obj.changes.path;
                tablerow.querySelector('td.key').title = obj.changes.path;
                tablerow.querySelector('td.url').innerText = obj.changes.url;
                tablerow.querySelector('td.url').title = obj.changes.url;
                tablerow.key = obj.changes.path;
                tablerow.dataset.key = obj.changes.path;
                tablerow.display = obj.changes.display_name;
                tablerow.dataset.display = obj.changes.display_name;
                alphabetizeTable(tablerow.parentElement, tablerow.parentElement.removeChild(tablerow));
                tablerow.scrollIntoView({block: "center"});
            }
            else {
                alert(`Error: ${response.error}`)
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }
    })

    form.querySelector('.menuDelete').addEventListener('click', async (event) => {

        if (!window.confirm('Delete this Sheetmusic?\nThis action cannot be undone')) return;

        let obj = {key: tablerow.key};

        try {
            let response = await deleteData('/musicdata/', obj);
            if (response && response.status == 'success'){
                windowPrevent(false);
                document.body.removeChild(overlay);
                // location.reload();
                tablerow.parentNode.removeChild(tablerow);
            }
            else {
                alert(`Error: ${response.error}`)
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }

    })
}

async function addMusic() {

    if (window.prevent) return;

    let form = await fileMenu('Add New Sheetmusic', 'music', 'New Sheetmusic', '', '', false);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        let obj = {
            key: data.get('key').trim(),
            display_name: data.get('title').trim(),
            url: data.get('url').trim()
        };

        try {
            let response = await postData('/musicdata/', obj);
            if (response && response.status == 'success') {
                windowPrevent(false);
                document.body.removeChild(overlay);
                // location.reload();
                let newFile = document.createElement('tr');
                newFile.key = obj.key;
                newFile.dataset.key = obj.key;
                newFile.display = obj.display_name;
                newFile.dataset.display = obj.display_name;
                newFile.innerHTML = `
                <td class="title">
                    <a href="${response.extra.href}" target="_blank"> ${obj.display_name}</a>
                </td>
                <td class="key" title="${obj.key}">${obj.key}</td>
                <td class="url" title="${obj.url}">${obj.url}</td>
                <td class="button">
                    <button class="table-edit-button" type="button" onclick="editMusic(this.parentNode.parentNode)">
                        <svg xmlns="http://www.w3.org/2000/svg" x="0" y="0" viewBox="0 0 400 400">
                            <g>
                                <path id="svg_6" d="m167.78745,30.3895c0,0 -68.70836,-0.74997 -72,-0.66667c-12.24984,0.04169 -30.66667,6.66667 -49.33334,23.33334c-18.66666,16.66666 -27.08334,39.4587 -27.33333,49.33333c-0.37499,17.87432 -1.33333,205.33333 -1.33333,205.33333c-0.62498,11.62456 8,34 26,50.66667c18,16.66667 46,22.66667 54.66666,22.66667c96,0 172.79159,-0.54175 192,-1.33334c19.20841,-0.79159 46.66666,-16.99999 58,-28.66666c11.33334,-11.66667 19.74985,-27.83362 19.87485,-36.04181c0.20834,-15.54152 0.79182,-83.95819 0.79182,-83.95819" opacity="NaN" stroke-width="31" fill="none"/>
                                <g id="svg_14">
                                    <path id="svg_8" d="m124.12078,272.3895c0,0 64.99519,-7.84425 64.99519,-7.84425c20.17092,-1.12061 170.33221,-171.45282 170.33221,-171.45282c0,0 43.70366,-34.73881 10.08546,-68.35701c-29.13577,-27.45486 -66.11579,16.2488 -66.11579,16.2488c0,0 -161.36736,159.12615 -161.92766,159.12615c-16.8091,12.32667 -17.3694,72.27913 -17.3694,72.27913z" opacity="NaN" stroke-width="30" fill="none"/>
                                    <path id="svg_9" d="m143.1711,193.94704c0,0 56.03033,61.63337 56.03033,61.63337" opacity="NaN" stroke-width="20" fill="none"/>
                                    <path id="svg_10" d="m309.02088,32.01937c0,0 56.03034,61.63336 56.03034,61.63336" opacity="NaN" stroke-width="20" fill="none"/>
                                </g>
                            </g>
                        </svg>
                    </button>
                </td>`;

                alphabetizeTable(document.getElementById('music').querySelector('tbody'), newFile);
                newFile.scrollIntoView({block: "center"});
            }
            else {
                alert(`Error: ${response.error}`)
            }
        }
        catch (error) {
            alert(`Server Error: ${error}`);
        }
    })

    windowPrevent(true);
}

async function getItem(modulepos, position) {
    try {
        const response = await fetch(`./item/${modulepos}/${position}`, {
        headers: {
            'Content-Type': 'application/json', // Indicate JSON data
        }});

        if (!response.ok) {
            throw new Error(`${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json(); // Parse the response as JSON
        const obj = {
            'status': 'success',
            'item': responseData
        }
        return obj;
    } catch (error) {
        const obj = {
            'status': 'error',
            'error': error
        }
    }
}

async function getFile(key) {
    try {
        const response = await fetch(`../file/${key}`, {
        headers: {
            'Content-Type': 'application/json', // Indicate JSON data
        }});

        if (!response.ok) {
            throw new Error(`${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json(); // Parse the response as JSON
        const obj = {
            'status': 'success',
            'file': responseData
        }
        return obj;
    } catch (error) {
        const obj = {
            'status': 'error',
            'error': error
        }
    }
}

async function getMusic(key) {
    try {
        const response = await fetch(`../music/${key}`, {
        headers: {
            'Content-Type': 'application/json', // Indicate JSON data
        }});

        if (!response.ok) {
            throw new Error(`${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json(); // Parse the response as JSON
        const obj = {
            'status': 'success',
            'music': responseData
        }
        return obj;
    } catch (error) {
        const obj = {
            'status': 'error',
            'error': error
        }
    }
}

async function getOptions(url) {
    try {
        const response = await fetch(`./${url}/all`, {
        headers: {
            'Content-Type': 'application/json', // Indicate JSON data
        }});

        if (!response.ok) {
            throw new Error(`${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json(); // Parse the response as JSON
        const obj = {
            'status': 'success',
            'options': responseData
        }
        return obj;
    } catch (error) {
        const obj = {
            'status': 'error',
            'error': error
        }
    }
}

/**
 * 
 * @param {HTMLElement} tablebody 
 * @param {HTMLElement} tablerow 
 * @returns 
 */
function alphabetizeTable(tablebody, tablerow) {
    tablerow.style.animationName = "highlighted-file";
    tablerow.style.animationDuration = "1.5s";
    tablerow.onanimationend = () => {
        tablerow.removeAttribute('style');
        tablerow.onanimationend = null;
    }
    let rows = [...tablebody.querySelectorAll('tr')];
    for (const row of rows) {
        let comparison = row.display.localeCompare(tablerow.display);
        if (comparison > 0 || (comparison == 0 && row.key.localeCompare(tablerow.key) > 0)) {
            tablebody.insertBefore(tablerow, row);
            return;
        }
    }
    tablebody.appendChild(tablerow);
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

        if (!response) {
            throw new Error(`${response.status}: ${response.statusText}`);
        }

        if (!response.ok) {
            const message = await response.text();
            let obj = {
                status: 'error',
                error: message.split('<p>')[1].split('</p>')[0]
            };
            return obj;
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

        if (!response) {
            throw new Error(`${response.status}: ${response.statusText}`);
        }

        if (!response.ok) {
            const message = await response.text();
            let obj = {
                status: 'error',
                error: message.split('<p>')[1].split('</p>')[0]
            };
            return obj;
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

        if (!response) {
            throw new Error(`${response.status}: ${response.statusText}`);
        }

        if (!response.ok) {
            const message = await response.text();
            let obj = {
                status: 'error',
                error: message.split('<p>')[1].split('</p>')[0]
            };
            return obj;
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

        if (!response) {
            throw new Error(`${response.status}: ${response.statusText}`);
        }

        if (!response.ok) {
            const message = await response.text();
            let obj = {
                status: 'error',
                error: message.split('<p>')[1].split('</p>')[0]
            };
            return obj;
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
        url: id,
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