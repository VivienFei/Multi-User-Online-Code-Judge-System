import { Injectable } from '@angular/core';
import { COLORS } from '../../assets/colors';

declare var io: any;
declare var ace: any;

@Injectable()
export class CollaborationService {
  collaborationSocket: any;
  clientsInfo: Object = {};//本地维护clientinfo map
  clientNum: number = 0;

  constructor() { }

  init(editor: any, sessionId: string): void {
      this.collaborationSocket = io(window.location.origin, {query: 'sessionId=' + sessionId});

      this.collaborationSocket.on("change", (delta: string) => {
        console.log("collaboration: editor changes by " + delta);
        delta = JSON.parse(delta);
        editor.lastAppliedChange = delta;
        editor.getSession().getDocument().applyDeltas([delta]);
      });

      this.collaborationSocket.on("cursorMove", (cursor) => { //绑定在cursorMove
        console.log("cursor move: " + cursor);
        let session = editor.getSession(); //需要使用session里面的api
        cursor = JSON.parse(cursor);            //收到的cursor parse一下
        let x = cursor['row'];
        let y = cursor['column'];
        let changeClinetId = cursor['socketId']; //谁的clientId
        console.log(x + ' ' + y + ' ' + changeClinetId); //在本地更改光标

        if(changeClinetId in this.clientsInfo) {//删掉旧的光标，更新新的光标，每个用户有自己的颜色，本地维护clientinfo map
          session.removeMarker(this.clientsInfo[changeClinetId]['marker']); //这个人信息是否保存在本地？ 短的细的marker作为光标
        } else {
          this.clientsInfo[changeClinetId] = {}; //clientsInfo map，指定一个颜色，动态改变css
          let css = document.createElement("style");
          css.type = "text/css";
          css.innerHTML = ".editor_cursor_" + changeClinetId
            + " { position:absolute; background:" + COLORS[this.clientNum] + ";"
            + " z-index: 100; width:3px !important; }";
          document.body.appendChild(css);
          this.clientNum ++;
        }
        let Range = ace.require('ace/range').Range;
        let newMarker = session.addMarker(new Range(x, y, x, y + 1), 'editor_cursor_' + changeClinetId, true);
        this.clientsInfo[changeClinetId]['marker'] = newMarker;
      });

      //Test
      this.collaborationSocket.on("message", (message) => {
          console.log("received: " + message);
      })
  }

  change(delta: string): void {
    this.collaborationSocket.emit("change", delta);
  }

  cursorMove(cursor: string): void { //server绑定发送给server
    this.collaborationSocket.emit("cursorMove", cursor);
  }

  restoreBuffer(): void {
    this.collaborationSocket.emit("restoreBuffer");
  }
}
