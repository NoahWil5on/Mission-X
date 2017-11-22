const functions = require('firebase-functions');
const firebase = require("firebase/app");
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

const ref = admin.database().ref();

exports.commentTrigger = functions.database.ref('/messages/{postId}/{messageId}').onWrite(event => {
    if(event.params.postId == 'main') return;

    var data = event.data.val();
    if(!data.id || data.id == "" || data.id == undefined || data.id == null) return

    return ref.child(`/subscriptions/${event.params.postId}`).once('value').then(snapshot => {
        var foundUser = false;
        if(!snapshot.val()){
            //ref.child(`/subscriptions/${event.params.postId}`).push(data.id);
            return;
        }
        snapshot.forEach(function(element) {
            var id = element.val();
            if(id == data.id){
                foundUser = true;
                return;
            }
            notify(id, 'notifyComments', data, event.params.postId);
        });
        // if(!foundUser){
        //     ref.child(`/subscriptions/${event.params.postId}`).push(data.id);
        //     return;
        // }
    })
});

function notify(id, notifyType, data, postId){
    ref.child(`/notifications/${id}/${postId}`).once('value', snapshot => {
        if(snapshot.hasChild(notifyType)){
            if(snapshot.val()[notifyType].seen){
                ref.child(`/notifications/${id}`).once('value', snap => {
                    if(!snap.hasChild('count')){
                        ref.child(`/notifications/${id}/count`).set(1);
                    }else{
                        ref.child(`/notifications/${id}`).update({
                            count: snap.val().count + 1
                        })
                    }
                })
            }
            ref.child(`/notifications/${id}/${postId}/${notifyType}`).update({
                message: data.message,
                name: data.name,
                seen: false,
                time: Date.now()
            }); 
        }else{
            ref.child(`/notifications/${id}`).once('value', snap => {
                if(!snap.hasChild('count')){
                    ref.child(`/notifications/${id}/count`).set(1);
                }else{
                    ref.child(`/notifications/${id}`).update({
                        count: snap.val().count + 1
                    })
                }
            }).then(_ => {
                ref.child(`/notifications/${id}/${postId}/${notifyType}`).set({
                    message: data.message,
                    name: data.name,
                    seen: false,
                    time: Date.now()
                });
            });
        }
    });
}
