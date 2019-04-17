# kiku.ts
Cross device synchronised audio buffer recording - on the web.

# What is kiku.ts?

I needed the ability to be able to attempt to record audio buffers across multiple smart phones at the same time, so that each buffer was synced up. In reality - this is a very difficult task especially in the browser: `kiku.ts` is an attempt to minimize the effect that offset buffers would have at least on one particular application.

It uses a combination of WebAudio to extract the buffers, and [PeerJS](https://peerjs.com/) - built ontop of WebRTC - to communicate between devices.

The project is written in TypeScript but uses [WebPack](https://webpack.js.org/) (as well as [unminified-webpack-plugin](https://www.npmjs.com/package/unminified-webpack-plugin)) and [ts-loader](https://github.com/TypeStrong/ts-loader) to output an easily accessible JavaScript callable interface.

# Getting Started

Firstly it is required to have the `Peer` object acessible on the window, so the [PeerJS](https://github.com/peers/peerjs) library must be included:

```
<script src="js/peerjs.min.js"></script>
```

For more information or help on setting up `Peer`, please visit the [PeerJS](https://github.com/peers/peerjs) documentation for getting started.

Then, `kiku.ts` can be simply included by adding the built library within your web app in a script tag:

```
<script src="js/libkiku.js" type="text/javascript"></script>
```

## Using kiku.ts

Once the source is correctly included, a global static singleton will be available (`window.Kiku`). This can be called in your JS code as:

```javascript
Kiku.setup() // Get the user permission for accessing recording
```

The `Kiku` object then needs to connect to a [`peerjs-server`](https://github.com/peers/peerjs-server) before attempting to connect to other devices:

```javascript
Kiku.connectToServer('thisDeviceName', // Device Name
                     'localhost',      // Server Address
                      9000,            // Port Number
                     '/myapp');        // PeerJS Server Info
```

Once the device has connected, the `Kiku` object can begin to interact with other devices. To initiate a connection to another device:

```javascript
Kiku.connectToDevice('otherDeviceName');
```

To start a cross device recording, the asynchronous recording functionality can be used:

```javascript
let output = await Kiku.startRecording('otherDeviceName', // Other device's name to also record a buffer on
                                       secondsFromNow);   // Miliseconds from now to start recording
```

The `output` object will then contain both devices recorded buffers, as well as the estimated recording offset and an average network delay (all in miliseconds).

# Author

Magnus Woodgate
