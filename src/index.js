import React from 'react';
import ReactDOM from 'react-dom';
import './index.css'
import {Table, Input, Popconfirm, Tabs, notification, Alert} from 'antd';
import SockJS from 'sockjs-client'
import Stomp from 'stompjs'

const TabPane = Tabs.TabPane

const users = {
    '111111': {
        message: [
            {
                key: 0,
                projectId: 1,
                projectName: '项目名称',
                question: '问题',
                answer: '自动计算的答案',
                logQaId: '后台记录的id1',
                sender: '111111'
            }
        ]
    },
    '222222': {
        message: [
            {
                key: 0,
                projectId: 2,
                projectName: '项目名称2',
                question: '问题',
                answer: '自动计算的答案2',
                logQaId: '后台记录的id2',
                sender: ''
            },
            {
                key: 1,
                projectId: 3,
                projectName: '项目名称3',
                question: '问题',
                answer: '自动计算的答案3',
                logQaId: '后台记录的id3',
                sender: '222222'
            }
        ]
    }
}

// //存储数据
// const users = {
//
// }

// 表格单元格组件
const EditableCell = ({editable, value, onChange}) => (
    <div style={{"textAlign": "center"}}>
        {editable
            ? <Input style={{margin: '-5px 0'}} value={value} onChange={e => onChange(e.target.value)}/>
            : value
        }
    </div>
);

// 可编辑表格组件
class EditableTable extends React.Component {
    constructor(props) {
        super(props);
        this.columns = [{
            title: '项目',
            dataIndex: 'projectName',
            width: '10%',
            render: (text, record) => this.renderColumns(text, record, 'project'),
        }, {
            title: '问题',
            dataIndex: 'question',
            width: '30%',
            render: (text, record) => this.renderColumns(text, record, 'question'),
        }, {
            title: '回答',
            dataIndex: 'answer',
            width: '30%',
            render: (text, record) => this.renderColumns(text, record, 'answer'),
        }, {
            title: '操作',
            dataIndex: 'operation',
            render: (text, record) => {
                const {editable} = record;
                return (
                    <div className="editable-row-operations" style={{"textAlign": "center"}}>
                        {
                            editable ?
                                <span>
                                  <a onClick={() => this.save(record.key)}>保存</a>
                                  <Popconfirm title="Sure to cancel?" onConfirm={() => this.cancel(record.key)}>
                                    <a style={{marginLeft: '10px'}}>取消</a>
                                  </Popconfirm>
                                </span>
                                : <div>
                                    <a onClick={() => this.edit(record.key)}>编辑</a>
                                    <a onClick={() => this.submit(record.key)} style={{marginLeft: '10px'}}>发送</a>
                                </div>
                        }
                    </div>
                );
            },
        }];
        this.state = {data: this.props.data.message};
        this.cacheData = this.state.data.map(item => ({...item}));
    }

    shouldComponentUpdate(){
        console.log('表格state')
        console.log(this.state)
        return true
    }

    renderColumns(text, record, column) {
        return (
            <EditableCell
                editable={record.editable && column === 'answer'}
                value={text}
                onChange={value => this.handleChange(value, record.key, column)}
            />
        );
    }

    handleChange(value, key, column) {
        const newData = [...this.state.data];
        const target = newData.filter(item => key === item.key)[0];
        if (target) {
            target[column] = value;
            this.setState({data: newData});
        }
    }

    edit(key) {
        const newData = [...this.state.data];
        const target = newData.filter(item => key === item.key)[0];
        if (target) {
            target.editable = true;
            this.setState({data: newData});
        }
    }

    save(key) {
        const newData = [...this.state.data];
        const target = newData.filter(item => key === item.key)[0];
        if (target) {
            delete target.editable;
            this.setState({data: newData});
            this.cacheData = newData.map(item => ({...item}));
            // this.props.handleModifyData(key,this.props.user,newData)
        }
    }

    cancel(key) {
        const newData = [...this.state.data];
        const target = newData.filter(item => key === item.key)[0];
        if (target) {
            Object.assign(target, this.cacheData.filter(item => key === item.key)[0]);
            delete target.editable;
            this.setState({data: newData});
        }
    }

    submit(key) {
        console.log('key:'+key)
        console.log(this.state.data)
        console.log(this.state.data[key])
        console.log(this.state)
        const target = this.state.data.filter(item => key === item.key)[0];
        this.props.handleSubmitMessage({
            key: key,
            receiver: this.props.user,
            logQaId: target.logQaId,
            answer: target.answer
        })
        let index = this.state.data.indexOf(target)
        let tempData = this.state.data
        tempData.splice(index,1)
        this.setState({
            data: tempData
        })
    }

    render() {
        console.log('updata!')
        return <Table bordered dataSource={this.state.data} columns={this.columns}/>;
    }
}

//最外层组件
class App extends React.Component {
    constructor(props){
        super(props)
        this.state= {users: users}
        this.stompClient = null
        this.handleNotification = this.handleNotification.bind(this)
        this.handleSubmitMessage = this.handleSubmitMessage.bind(this)
        this.handleModifyData = this.handleModifyData.bind(this)
        this.test = this.test.bind(this)
    }

    shouldComponentUpdate(){
        return true
    }

    componentDidMount(){
        const sock = new SockJS('/ws');
        this.stompClient = Stomp.over(sock)
        this.stompClient.connect('guest', 'guest', function (frame) {
            this.stompClient.subscribe("/user/admin/queue/chat", this.handleNotification);
        }.bind(this))
    }

    handleNotification(msg){
        console.log('收到消息：')
        console.log(msg.body)
        console.log('msg类型是：'+typeof msg.body)
        const res = JSON.parse(msg.body)
        console.log(res)
        console.log('res：'+typeof res)
        let tempData = this.state.users
        // 如果已有当前用户，则在当前用户数据下新增
        if(this.state.users.hasOwnProperty(res.sender)){
            // 根据已有数组长度，手动增加key值
            let key = tempData[res.sender].message.length
            res.key = key
            tempData[res.sender].message.push(res)
        }else{
            //如果没有当前用户，则新建用户
            tempData[res.sender] = {}
            tempData[res.sender].message = []
            let key = tempData[res.sender].message.length
            res.key = key
            tempData[res.sender].message.push(res)
        }
        //产生通知
        const args = {
            message: `收到了一条来自用户${res.sender}的消息`,
            duration: 0,
        };
        notification['success'](args);
        this.setState({
            users: tempData
        })
    }

    handleModifyData(key,user,data){
        console.log(user)
        let tempData = this.state.users
        tempData[user].message[key] = data
        // for(var k in tempData){
        //     tempData[k].message.map((item,index)=>{
        //         item[key] = index
        //     })
        // }
        this.setState({
            users: tempData
        })
    }

    handleSubmitMessage(param){
        let tempData = this.state.users

        tempData[param.receiver].message.splice(param.key, 1)

        for(var k in tempData){
            tempData[k].message.map((item,index)=>{
                item.key = index
            })
        }

        delete param.key

        console.log('更新数据：')
        console.log(tempData)

        this.setState({
            users: tempData
        })
        this.stompClient.send("/scibot/s/chat", {}, JSON.stringify(param))
        console.log('from children:')
        console.log(param)
    }

    test(){
        let tempData = this.state.users
        let key = tempData['222222'].message.length

        let testData  = {
            key: key,
            projectId: key,
            projectName: `项目名称${key}`,
            question: '问题',
            answer: `自动计算的答案${key}`,
            logQaId: `后台记录的id${key}`,
            sender: '222222'
        }

        // res.key = key
        tempData['222222'].message.push(testData)

        console.log('更新数据：')
        console.log(tempData)

        this.setState({
            users: tempData
        })

        setTimeout(()=>{
            console.log('This users')
            console.log(this.state.users)
        },1)
    }

    render() {
        const children = []
        console.log('dadjhkjasdhask')
        console.log(this.state.users)
        for(var key in users){
            children.push(<TabPane key={key} tab={`用户 ${key}`}><EditableTable handleSubmitMessage={this.handleSubmitMessage} user={key} data={this.state.users[key]} handleModifyData={this.handleModifyData}/></TabPane>)
        }
        return (
            <div>
                <h1 style={{'marginBottom': 20}}>科研政策自动问答后台管理系统</h1>
                <button onClick={this.test}>测试按钮</button>
                {Object.keys(users).length>0?
                (<Tabs defaultActiveKey="1" tabPosition="left">
                    {children}
                </Tabs>):(<Alert message="暂无数据,请等待用户发送" type="info" showIcon />)}
            </div>
        )
    }
}

ReactDOM.render(<App />, document.getElementById('root'));
