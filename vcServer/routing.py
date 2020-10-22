from django.conf.urls import url

from . import consumers

websocket_urlpatterns = [
    url(r'^ws/call/(?P<room_name>[-\w]+)/$', consumers.VCConsumer),
]
