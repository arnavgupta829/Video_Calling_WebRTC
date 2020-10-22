import json

from channels.generic.websocket import AsyncWebsocketConsumer
import os
import numpy as np

class VCConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        print(self.room_name)
        self.room_group_name = 'call_%s' % self.room_name

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        information_json = json.loads(text_data)
        typeInfo = information_json["type"]
        if(typeInfo == "textmessage"):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chatMessage',
                    'id': information_json['id'],
                    'kind': 'Chat',
                    'message': information_json['message'],
                }
            )

        elif(typeInfo == "setup"):
            await self.channel_layer.group_send(
                self.room_group_name,
                {   
                    'type': 'setup',
                    'number': information_json['number'],
                    'kind': 'VC',
                    'id': information_json['id'],
                    'destination': information_json['destination'],
                }
            )

        elif(typeInfo == "offer"):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'offer',
                    'kind': 'VC',
                    'id': information_json['id'],
                    'offer': information_json['offer'],
                    'destination': information_json['destination'],
                }
            )

        elif(typeInfo == "answer"):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'answer',
                    'kind': 'VC',
                    'id': information_json['id'],
                    'answer': information_json['answer'],
                    'destination': information_json['destination'],
                }
            )
        
        elif(typeInfo == "candidate"):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'candidate',
                    'kind': 'VC',
                    'id': information_json['id'],
                    'candidate': information_json['candidate'],
                    'destination': information_json['destination'],
                }
            )

    async def chatMessage(self, event):
        await self.send(text_data = json.dumps(event))

    async def setup(self, event):
        await self.send(text_data = json.dumps(event))

    async def offer(self, event):
        await self.send(text_data = json.dumps(event))

    async def answer(self, event):
        await self.send(text_data = json.dumps(event))

    async def candidate(self, event):
        await self.send(text_data = json.dumps(event))
