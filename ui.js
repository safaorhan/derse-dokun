var db = undefined;
var user = undefined;
var isInTheRoom = false;
var isBoardVisible = false;
var room = undefined;

const hands = [];

setTimeout(onAllScriptsLoaded, 2000)

function _meetId() {
    return window.location.pathname.split('/')[1];
}

function _actionPanel() {
    return document.querySelector('.q2u11')
}

function _topPanel() {
    return document.querySelector('.NzPR9b')
}

function onAllScriptsLoaded() {
    setUpFirebase();
    setUpExitListener();
    user = generateUser();
    startCheckingVideoStatus();
}

function startListeningRoom() {
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

    db.collection("rooms").doc(meetId).onSnapshot(function(doc) {
        room = doc.data()

        if (room) {
            if (room.instructor == user.email) {
                console.log("Setting up instructor view.")
                setUpInstructorView();
            } else {
                console.log("Setting up student view.")
                setUpStudentView();
            }

            setTimeout(function() {
                if (room.board) {
                    loadIframe(room.board);
                    showBoard();
                } else {
                    unloadIframe();
                    hideBoard();
                }
            }, 50)

        } else {
            let instructor = "";
            if (new URLSearchParams(window.location.search).get("pass") == "1234") {
                instructor = user.email
            }

            updateRoom({
                board: "",
                instructor: instructor
            })
        }

    });
}

function listenPeopleInTheRoom() {
    const meetId = _meetId()

    db.collection("people").where("room", "==", meetId)
        .onSnapshot(function(querySnapshot) {
            console.log("People:")

            for (let i = 0; i < querySnapshot.size; i++) {
                const person = querySnapshot.docs[i].data();

                console.log(person);

                if (person.email == user.email) {
                    updateUserLocally(person)
                }

                if (hands[i] !== person.raisingHand) {
                    hands[i] = person.raisingHand
                    if (hands[i]) {
                        setTimeout(function() {
                            showHand(i)
                        }, 50)
                    } else {
                        setTimeout(function() {
                            hideHand(i)
                        }, 50)
                    }
                }
            }
        })
}

function createUpdateUser(user) {
    db.collection("people").doc(user.email).set(user, { merge: true }).then(function() {
        console.log("User info successfully written!");
    }).catch(function(error) {
        console.error("Error writing user info: ", error);
    });
}

function updateRoom(room) {
    const meetId = _meetId()

    db.collection("rooms").doc(meetId).set(room, { merge: true }).then(function() {
        console.log("Room updated successfully!");
    }).catch(function(error) {
        console.error("Error updating room: ", error);
    });
}

function removeMeFromRoom() {
    createUpdateUser({ email: user.email, room: '' })
}

function raiseHand() {
    createUpdateUser({ email: user.email, raisingHand: true })
}

function putTheHandDown() {
    createUpdateUser({ email: user.email, raisingHand: false })
}

function addUrlToBoard(url) {
    updateRoom({
        board: url
    })
}

function setUpExitListener() {
    window.onbeforeunload = function() {
        removeMeFromRoom()
        return;
    }
}

function setUpInstructorView() {
    addOverlay()
    addBoardButton()
}

function setUpStudentView() {
    addOverlay()
    addRaiseHandButton()
    addBoardButton()
    addStudentBoard()
}

function addRaiseHandButton() {
    if (document.querySelector('.handButton')) return;

    const actionPanel = _actionPanel();
    const handSpan = document.createElement('span');
    handSpan.id = 'handSpan'
    actionPanel.append(handSpan)

    $("#handSpan").load(chrome.runtime.getURL("button.html"), function() {
        $(".handButton").click(onRaiseHandButtonClick);
    });
}

function addBoardButton() {
    if (document.querySelector('.boardButton')) return;

    const topPanel = _topPanel();
    const timeDiv = document.querySelector('.xfd0yd');

    $.get(chrome.runtime.getURL("board-button.html"), function(src) {
        const boardButton = htmlToElement(src);
        const dividerDiv = htmlToElement('<div class="qO3Z3c"></div>');
        topPanel.insertBefore(dividerDiv, timeDiv);
        topPanel.insertBefore(boardButton, timeDiv);
        $(".boardButton").click(onBoardButtonClick);
    });
}

function addStudentBoard() {
    if (document.querySelector('.student-board')) return;

    $.get(chrome.runtime.getURL("student-board.html"), function(src) {
        const studentBoard = htmlToElement(src);
        document.body.append(studentBoard);
    });
}

function onRaiseHandButtonClick() {
    $(".handButton").off("click")

    if (user.raisingHand) {
        putTheHandDown();
    } else {
        raiseHand();
    }

    setTimeout(function() {
        $(".handButton").click(onRaiseHandButtonClick);
    }, 1000);
}

function onBoardButtonClick() {
    if (isBoardVisible) {
        hideBoard();
    } else {
        showBoard();
    }
}

function addOverlay() {
    if (document.querySelector('#overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = "overlay"
    $(".crqnQb").append(overlay)

    const classroom = document.createElement('div')
    classroom.id = "classroom"
    overlay.append(classroom)

    for (let i = 0; i < 12; i++) {
        const desk = document.createElement("div");
        desk.classList.add("desk");

        if (i % 2 == 0) desk.classList.add("flipped");

        desk.id = "desk-" + i
        classroom.append(desk)

        const hand = document.createElement("div");
        hand.classList.add("hand");
        hand.classList.add("hand-" + i);
        hand.classList.add("hidden");
        desk.append(hand)
    }
}

function startCheckingVideoStatus() {
    var actionPanelAvailable = _actionPanel() && true;

    if (actionPanelAvailable && !isInTheRoom) {
        isInTheRoom = true;
        startListeningRoom();

    } else if (!actionPanelAvailable && isInTheRoom) {
        isInTheRoom = false;
        removeMeFromRoom();
    }

    setTimeout(startCheckingVideoStatus, 500);
}

function updateUserLocally(person) {
    user.points = person.points;
    user.raisingHand = person.raisingHand;
}

function showHand(i) {
    console.log("Showing hand for: " + i);

    const hand = document.querySelector(".hand-" + i)
    hand.classList.add("slide-in-bottom");
    hand.classList.remove("slide-out-bottom");
}

function hideHand(i) {
    console.log("Hiding hand for: " + i);

    const hand = document.querySelector(".hand-" + i)

    if (hand && hand.classList) {
        hand.classList.remove("slide-in-bottom");
        hand.classList.add("slide-out-bottom");
    }
}

function hideBoard() {
    if (isUserInstructor()) {
        document.querySelector(".instructor-board").style.visibility = "hidden";
    } else {
        document.querySelector(".student-board").style.visibility = "hidden";
    }

    isBoardVisible = false;
}

function showBoard() {
    if (isUserInstructor()) {
        document.querySelector(".instructor-board").style.visibility = "visible";
    } else {
        document.querySelector(".student-board").style.visibility = "visible";
    }

    isBoardVisible = true;
}

function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function isUserInstructor() {
    return room.instructor == user.email
}

function loadIframe(url) {
    document.querySelector(".iframe").src = url
}

function unloadIframe() {
    document.querySelector(".iframe").src = ''
}