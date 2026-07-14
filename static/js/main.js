window.addEventListener('load', setup);

function setup() {
    getDomReferences();

    isMobile = matchMedia("screen and (max-width: 759px)");

    addEventListeners();

    markActiveLink();

    mediaChanged();

    generateTitle();
}

function generateTitle() {
    let full = document.location.pathname;
    let parts = full.split('/');
    let title = '';

    if (parts.length == 2) {
        title = 'Home';
    }
    else if (parts[2].length == 0) {
        title = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    }
    else {
        title = document.getElementById('title').innerText;
    }

    document.title = `Glanvas | ${title}`;

}

function markActiveLink() {
    let full = document.location.href
    let partial = full.split("/")[3]

    let links = document.querySelectorAll("#sidebar2>ul>li>a");
    let found = false;

    links.forEach((value) => {
        if (value.href == full){
            value.classList.add("active");
            found = true;
        }
    })
    
    if (!found) {
        links.forEach((value) => {
            if (value.href == partial)
                value.classList.add("active");
        })
    }
}

function getDomReferences() {
    hamburgerButton = document.getElementById("sidebar-hamburger");
    sidebar = document.getElementById("sidebar1");
    main = document.getElementById('main');

    sidebarStyle = window.getComputedStyle(sidebar);
}

function addEventListeners() {
    hamburgerButton.addEventListener("click", sidebar_toggle);
    // document.querySelector("#sidebar2 > ul > li:nth-child(4) > a").addEventListener("click", testPost)
    isMobile.addEventListener("change", mediaChanged);
}

function sidebar_toggle() {
    if (sidebarStyle.display == "none") {
        sidebar.style.display = "block";
        hamburgerButton.setAttribute('title', 'Hide Navigation Menu');
        if (!isMobile.matches)
            main.setAttribute('style','margin-left: 192px;');
        else {
            document.getElementById('mobile-login-button').removeAttribute('style');
            document.getElementById('mobile-cal-button').style.display = "none";

        }
    }
    else {
        sidebar.style.display = "none";
        hamburgerButton.setAttribute('title', 'Show Navigation Menu');
        if (!isMobile.matches)
            main.setAttribute('style','margin-left: 0px;');
        else {
            document.getElementById('mobile-login-button').style.display = "none";
            document.getElementById('mobile-cal-button').removeAttribute('style');
        }
    }
}

function mediaChanged() {
    // List of everything that needs to be updated between mobile and desktop versions
    if (isMobile.matches) {
        sidebar.style.display = "none";
        main.setAttribute('style','margin-left: 0px;');
        let currentUrl = document.location.href.split("/")[3];
        if (currentUrl == 'file') {
            let iframe = document.getElementById("file-iframe");
            let fileURL = iframe.src.split("/");
            fileURL[fileURL.length - 1] = 'mobilebasic'
            iframe.src = fileURL.join("/");
        }
    }
    else {
        sidebar.style.display = "block";
        main.setAttribute('style','margin-left: 192px;');
        let currentUrl = document.location.href.split("/")[3];
        if (currentUrl == 'file') {
            let iframe = document.getElementById("file-iframe");
            let fileURL = iframe.src.split("/");
            fileURL[fileURL.length - 1] = 'preview'
            iframe.src = fileURL.join("/");
        }
    }
    setToggleButton();
}

function setToggleButton() {
    if (sidebarStyle.display === "none") {
        hamburgerButton.setAttribute('title', 'Show Navigation Menu');
    }
    else {
        hamburgerButton.setAttribute('title', 'Hide Navigation Menu');
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
        throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json(); // Parse the response as JSON
        console.log('Success:', responseData);
        return responseData;
    } catch (error) {
        console.error('Error:', error);
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
        throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json(); // Parse the response as JSON
        if (responseData.status == 'success') {
        console.log('Success!');
        }
        else {
        console.log('Error: ', responseData.message)
        }
        return responseData;
    } catch (error) {
        console.error('Error:', error);
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