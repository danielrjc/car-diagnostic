#!/usr/bin/env python
# -*- coding: utf-8 -*-
# Code taken from and modified https://stackoverflow.com/questions/60032983/record-voice-with-recorder-js-and-upload-it-to-python-flask-server-but-wav-file
from flask import Flask
from flask import request
from flask import render_template
import os
import json
import random 
from string import ascii_lowercase
import librosa
import librosa.display
import matplotlib.pyplot as plt
import tensorflow as tf
from utils import load_and_prep_image, classes_and_models, update_logger, predict_json
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = '/tmp'

#key for the model DON'T UPLOAD TO REPO
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "key.json" 
PROJECT = "splendid-map-313301"
REGION = "us-west1"

@app.route("/", methods=['POST', 'GET'])
def index():
    if request.method == "POST":
        f = request.files['audio_data']
        #save the audio with random name
        tmp_path = '/tmp/'
        audio_file = tmp_path+''.join(random.sample(ascii_lowercase, 10))+'.wav'
        with open(audio_file, 'wb') as audio:
            f.save(audio)
        #audio to spectrogram image conversion
        x, sr = librosa.load(audio_file, sr=44100)
        X = librosa.stft(x)
        Xdb = librosa.amplitude_to_db(abs(X))
        fig = plt.figure(figsize=(5, 5), dpi=1000, frameon=False)
        ax = fig.add_axes([0, 0, 1, 1], frameon=False)
        ax.axis('off')
        librosa.display.specshow(Xdb, sr=sr, cmap='gray', x_axis='time', y_axis='log')
        sg_name = tmp_path+''.join(random.sample(ascii_lowercase, 10))+'.png'
        plt.savefig(sg_name, quality=100, bbox_inches=0, pad_inches=0)
        fig.clear()
        plt.close(fig)
        os.remove(audio_file)
        print('spectrogram created successfully')
        #send request to make the prediction
        img, classify, u = make_prediction(sg_name, classes_and_models["model_1"]["model_name"], classes_and_models["model_1"]["classes"])
        print(classify)
        os.remove(sg_name)
        return classify
    else:
        return render_template("index.html")
#function taken from https://github.com/mrdbourke/cs329s-ml-deployment-tutorial/blob/main/food-vision/
def make_prediction(image, model, class_names):
    """
    Takes an image and uses model (a trained TensorFlow model) to make a
    prediction.
    Returns:
     image (preproccessed)
     pred_class (prediction class from class_names)
     pred_conf (model confidence)
    """
    image = load_and_prep_image(image)
    # Turn tensors into int16 (saves a lot of space, ML Engine has a limit of 1.5MB per request)
    image = tf.cast(tf.expand_dims(image, axis=0), tf.int16)
    # image = tf.expand_dims(image, axis=0)
    preds = predict_json(project=PROJECT,
                         region=REGION,
                         model=model,
                         instances=image)
    pred_class = class_names[tf.argmax(preds[0])]
    pred_conf = tf.reduce_max(preds[0])
    return image, pred_class, pred_conf

if __name__ == "__main__":
    app.run(debug=True)