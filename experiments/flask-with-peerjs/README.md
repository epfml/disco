Work done by Giorgio Savini. His original explanation of the setup:

It works like this: a model is trained locally with Pytorch and periodically serves its parameters (as JSON) over localhost using a Flask app. The peer on the same host machine where the model is being trained makes periodic requests for the parameters and sends them to another peer using PeerJS.
The flow of data in one direction looks like this:
```
|Pytorch| ---> |localhost| ---> |local peer| ---> (internet) ---> |remote peer|
```

(Disclaimers) The code is not very elaborate/stable, it is just meant as a demonstration and I did not test it with a remote peer. The neural network that gets trained is also pretty basic and is artificially slowed down with `sleep` statements.

To test it follow these steps (the order doesn't really matter).
- Start the Flask web app. The model takes a few minutes to train, so you should execute the subsequent steps within this time in order to have some meaninfgul communication.
```bash
cd local_webapp
export FLASK_APP=webapp.py
flask run --port 5001
```
- Open `peerjs-backend/local_peerjs_interface.html` in 2 tabs and open the console in both tabs
- On the left tab, type in `left`, `right` for "Username" and "Receiver", then click Register
- On the right tab, type in `right` for "Username" (don't fill in the "Receiver" field) and click Register.

Now in the console of the right tab you should see that the data from the peer on the left tab is periodically received.