from flask import Flask, make_response
from task import Producer
import json
app = Flask(__name__)

producer = Producer()
producer.train()

@app.route("/")
def get_data():
    resp = make_response(producer.get_info())
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp