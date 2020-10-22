from django.shortcuts import render
from django.views.generic import View
# Create your views here.

def index(request):
    return render(request, 'videoCall/index.html')

def room(request, room_name):
    return render(request, 'videoCall/room2.html', {
        'room_name': room_name
    })
