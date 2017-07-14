# SoftSPI

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/ca80cd5ead9d414487773148ab5122d0)](https://www.codacy.com/app/Vertumnus/js-rpi-softspi?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Vertumnus/js-rpi-softspi&amp;utm_campaign=Badge_Grade)
[![Coverage Status](https://coveralls.io/repos/github/Vertumnus/js-rpi-softspi/badge.svg?branch=master)](https://coveralls.io/github/Vertumnus/js-rpi-softspi?branch=master)
[![npm](https://img.shields.io/npm/dt/rpi-softspi.svg)](https://www.npmjs.com/package/rpi-softspi)
[![npm](https://img.shields.io/npm/v/rpi-softspi.svg)](https://www.npmjs.com/package/rpi-softspi)
[![npm](https://img.shields.io/npm/l/rpi-softspi.svg)](https://www.npmjs.com/package/rpi-softspi)

This library contains a javascript class, which implements the SPI (Serial Peripheral Interface Bus)
for a Raspberry Pi. In contrast to other libraries it is a software implementation.
So it does not use the hardware SPI of the Raspberry Pi and you can choose any pin
of the GPIO for the needed logic signals of SPI.

## Motivation
I wanted to control some components with my Raspberry Pi, which are using SPI.
But a couple of clients (e.g. WS2801 led stripe) do not support a client select.
So I needed a software SPI and didn't find one for javascript. Now here is.

## Precondition
The library is implemented in ECMAScript 2015, so your project should support
at least this version.

## Installation
Install it via npm:
```shell
$ npm install rpi-softspi
```

## Usage
Start with importing the module via:
```js
var SoftSPI = require("rpi-softspi")
```

Create an instance for your client device specifying the used pins and 
needed configurations for the communication in an options object:
```js
let client = new SoftSPI({
   clock: 15,     // pin number of SCLK
   mosi: 11,      // pin number of MOSI
   miso: 13,      // pin number of MISO
   client: 16,    // pin number of CS
   clientSelect: rpio.LOW, // trigger signal for the client
   mode: 0,                // clock mode (0 - 3)
   bitOrder: SoftSPI.MSB   // bit order in communication
})
```
> At least you have to specify the clock pin, all other can be left unspecified
> to use the default configuration

This is the default configuration:
```js
default = {
   clock: null,
   miso: null,
   mosi: null,
   client: null,
   clientSelect: rpio.LOW,
   mode: 0,
   bitOrder: SoftSPI.MSB
}
```

Clock modes are:

| Mode  | Polarity | Phase |
| :---: | :---:    | :---: |
| 0     | 0        | 0     |
| 1     | 0        | 1     |
| 2     | 1        | 0     |
| 3     | 1        | 1     |

Start the communication:
```js
client.open()
```
> The SoftSPI is in an invalid state till you open the communication. If it is
> invalid you cannot transfer data.

Close the communication:
```js
client.close()
```
> Once you close the communication the SoftSPI changes again to invalid state.

Read (only) a number of bytes from the client:
```js
let bytes = client.read(5)
// bytes[0] = first byte
```

Write data (only) to the client:
```js
client.write([0xff, 0x01, 0xab]) //supply any data
```

Transfer data to and from the client:
```js
let bytes = client.transfer([0xff, 0x01, 0xab])
```
> The number of returned bytes is the same number of bytes you have supplied

## Example
> We assume the connected client wants the numbers `1234` and continues to count
> by returning `5678`.

```js
var SoftSPI = require("rpi-softspi")

let client = new SoftSPI({
   clock: 15,     // pin number of SCLK
   mosi: 11,      // pin number of MOSI
   miso: 13,      // pin number of MISO
   client: 16,    // pin number of CS
})

client.open()
let send = [1, 2, 3, 4]
let answer = client.transfer(send)
// Count: 1,2,3,4...5,6,7,8
console.log("Count: " + send.toString() + "..." + answer.toString())
client.close()
```

## API
Check out the [documentation](doc) for details.

## License
MIT

## Additional Information
Find a description on [Wikipedia - Serial Peripheral Interface Bus](https://en.wikipedia.org/wiki/Serial_Peripheral_Interface_Bus)
or with the keywords SPI as well as Serial Peripheral Interface.