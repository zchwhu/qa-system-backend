/**
 * Created by Administrator on 2018/3/11.
 */
const express = require('express')
const app = express()

const server = require('http').Server(app)
const io = require('socket.io')(server)

io.on('connection', function(socket){
    console.log('websocket connect')
    socket.on('sendmsg', function (data) {
        // io.emit('recvmsg', data)
        console.log(data)
        io.emit('recvmsg',data)
    })
});



server.listen(9093, function () {
    console.log('Node app start at port 9093')
})

app.use('/test', function () {
    console.log('test')
})