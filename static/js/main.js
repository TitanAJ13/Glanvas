window.addEventListener('load', setup);

function setup() {
    getDomReferences();
    addEventListeners();
}

function getDomReferences() {
    hamburgerButton = document.getElementById("sidebar-hamburger");
    sidebar = document.getElementById("sidebar1");
    main = document.getElementById('main');
}

function addEventListeners() {
    hamburgerButton.addEventListener("click", sidebar_toggle);
    document.querySelector("#sidebar2 > ul > li:nth-child(4) > a").addEventListener("click", testPost)
}

function sidebar_toggle() {
    if (sidebar.style.display === "none") {
        sidebar.style.display = "block";
        hamburgerButton.setAttribute('title', 'Hide Navigation Menu');
        main.setAttribute('style','margin-left: 192px;');
    }
    else {
        sidebar.style.display = "none";
        hamburgerButton.setAttribute('title', 'Show Navigation Menu');
        main.setAttribute('style','margin-left: 0px;');
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
  deleteData('/announcements', {id: id})
}