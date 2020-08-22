var db = undefined;
var user = undefined;

setTimeout(onAllScriptsLoaded, 2000)

function _meetId() {
    return window.location.pathname.split('/')[1];
}

function onAllScriptsLoaded() {
    setUpFirebase();

    setUpExitListener();

    user = generateUser();
    createUpdateUser(user);

    listenRoomData();
    listenPeopleInTheRoom();
}

function generateUser() {
    for (let script of document.scripts) {
        if (script.text.includes('https://accounts.google.com/ServiceLogin')) {
            const re = /AF_initDataCallback\(([\w\W]*)\)\;/
            const code = 'var dataWrapper = ' + script.text.match(re)[1]
            eval(code)
            const data = dataWrapper.data
            return {
                email: data[4],
                name: data[6],
                raisingHand: false,
                room: _meetId()
            }
        }
    }
}

function setUpFirebase() {
    const firebaseConfig = {
        apiKey: "AIzaSyADf3xRZG3wy6Ulz4OdPsgFfzgupnqu8_Q",
        authDomain: "derse-dokun.firebaseapp.com",
        databaseURL: "https://derse-dokun.firebaseio.com",
        projectId: "derse-dokun",
        storageBucket: "derse-dokun.appspot.com",
        messagingSenderId: "22539059073",
        appId: "1:22539059073:web:c3fc5427ed7f062f9ab280",
        measurementId: "G-JZH7DVJKX0"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    db = firebase.firestore();
}

function listenRoomData() {
    const meetId = _meetId()

    db.collection("rooms").doc(meetId).onSnapshot(function (doc) {
        console.log("Room: ", doc.data());
    });
}

function listenPeopleInTheRoom() {
    const meetId = _meetId()

    db.collection("people").where("room", "==", meetId)
        .onSnapshot(function (querySnapshot) {
            console.log("People:")

            querySnapshot.forEach(function (doc) {
                console.log(doc.id, " => ", doc.data());
            });
        })
}

function createUpdateUser(user) {
    db.collection("people").doc(user.email).set(user, { merge: true }).then(function () {
        console.log("User info successfully written!");
    }).catch(function (error) {
        console.error("Error writing user info: ", error);
    });
}

function removeMeFromRoom() {
    createUpdateUser({email: user.email, room: ''})
}

function setUpExitListener() {
    window.onbeforeunload = function() {

        removeMeFromRoom()

        return;
    }
}