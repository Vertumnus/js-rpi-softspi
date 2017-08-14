/* 
 * Copyright Armin Junge
 */


var mock = require("mock-require")
mock("rpio", {
   LOW: 0,
   HIGH: 1,
   INPUT: "I",
   OUTPUT: "O",
   open: function(...args){
      this.result.open.push(args)
   },
   close: function(...args){
      this.result.close.push(args)
   },
   write: function(...args){
      args.unshift("w")
      this.result.comm.push(args)
   },
   read: function(...args){
      args.unshift("r")
      this.result.comm.push(args)
      return (0xca >> this.rcounter++) & 0x01 //test byte: 11001010
   },
   rcounter: 0,
   result: {
      open: [],
      close: [],
      comm: []
   },
   reset: function(){
      this.result.open = []
      this.result.close = []
      this.result.comm = []
      this.rcounter = 0
   }
})

var assert = require("assert")
var rpio = require("rpio")
var SoftSPI = require("../src/softspi.js")

describe("SoftSPI", function(){
   let firstClient = new SoftSPI({
         clock: 23,
         miso: 21,
         mosi: 19,
         client: 24
      })
   let secondClient = new SoftSPI({
         clock: 23,
         miso: 21,
         mosi: 19,
         client: 26,
         clientSelect: 1, //HIGH
         mode: 3,
         bitOrder: SoftSPI.LSB
      })
   let slave = new SoftSPI({ clock: 5 })
   
   describe("#constructor", function(){
      it("should throw an exception, because mandatory clock pin is not specified", function(){
         assert.throws(() => { let spi = new SoftSPI({}) }, 
                        /Clock.*specified/)
      })
      it("should have correct clock pin", function(){
         assert.equal(slave.clock, 5)
      })
      it("should have the default client select trigger", function(){
         assert.equal(slave.clientSelect, 0)
      })
      it("should have the default mode", function(){
         assert.equal(slave.mode, 0)
      })
      it("should have the default bit order", function(){
         assert.equal(slave.bitOrder, SoftSPI.MSB)
      })
   })
   
   describe("#Connection", function(){
      describe("-slave", function(){
         describe(".open", function(){
            before(function(){
               rpio.reset()
               slave.open()
            })
            it("should have opened only the clock pin as output", function(){
               let expected = [
                  [ 5, rpio.OUTPUT, rpio.LOW ]
               ]
               assert.deepEqual(rpio.result.open, expected)
            })
            it("should be valid", function(){
               assert.ok(slave.valid)
            })
         })
         describe(".close", function(){
            before(function(){
               slave.close()
            })
            it("should have closed only the clock pin", function(){
               let expected = [
                  [ 5 ]
               ]
               assert.deepEqual(rpio.result.close, expected)
            })
            it("should be invalid", function(){
               assert.ok(!slave.valid)
            })
         })
      })
      
      describe("-firstClient", function(){
         describe(".open", function(){
            before(function(){
               rpio.reset()
               firstClient.open()
            })
            it("should open the first client correct", function(){
               let expected = [
                  [ 23, rpio.OUTPUT, rpio.LOW ],
                  [ 24, rpio.OUTPUT, rpio.HIGH ],
                  [ 19, rpio.OUTPUT, rpio.LOW ],
                  [ 21, rpio.INPUT ]
               ]
               assert.deepEqual(rpio.result.open, expected)
            })
            it("should be valid", function(){
               assert.ok(firstClient.valid)
            })
         })
         describe(".close", function(){
            before(function(){
               firstClient.close()
            })
            it("should close the first client correct", function(){
               let expected = [
                  [ 21 ],
                  [ 19 ],
                  [ 23 ],
                  [ 24 ]
               ]
               assert.deepEqual(rpio.result.close, expected)
            })
            it("should be invalid", function(){
               assert.ok(!firstClient.valid)
            })
         })
      })
      
      describe("-secondClient", function(){
         before(function(){
            rpio.reset()
            secondClient.open()
         })
         it("should open the second client correct", function(){
            let expected = [
               [ 23, rpio.OUTPUT, rpio.HIGH ],
               [ 26, rpio.OUTPUT, rpio.LOW ],
               [ 19, rpio.OUTPUT, rpio.LOW ],
               [ 21, rpio.INPUT ]
            ]
            assert.deepEqual(rpio.result.open, expected)
         })
         it("should be valid", function(){
            assert.ok(secondClient.valid)
         })
         after(function(){
            secondClient.close()
         })
      })
   })
   
   describe("#write", function(){
      describe("-firstClient", function(){
         before(function(){
            rpio.reset()
            firstClient.open()
         })
         it("should write 0xCA, 0x00, 0xff in correct way", function(){
            firstClient.write([0xca, 0x00, 0xff]) //bin: 11001010, 00000000, 11111111
            let expected = [ //we walk from left to right in the byte
               [ "w", 24, rpio.LOW ], //client on
               /* first byte */
               [ "w", 19, rpio.HIGH ], //MOSI 1st bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 2nd bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 3rd bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 4th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 5th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 6th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 7th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 8th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               /* second byte */
               [ "w", 19, rpio.LOW ], //MOSI 1st bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 2nd bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 3rd bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 4th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 5th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 6th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 7th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 8th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               /* third byte */
               [ "w", 19, rpio.HIGH ], //MOSI 1st bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 2nd bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 3rd bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 4th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 5th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 6th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 7th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 8th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "w", 23, rpio.LOW ], //clock off
               /* end */
               [ "w", 24, rpio.HIGH ] //client off
            ]
            assert.deepEqual(rpio.result.comm, expected)
         })
         after(function(){
            firstClient.close()
         })
      })
      
      describe("-secondClient", function(){
         before(function(){
            rpio.reset()
            secondClient.open()
         })
         it("should write 0xCA in correct way", function(){
            secondClient.write([0xca]) //bin: 11001010
            let expected = [ //we walk from right to left in the byte
               [ "w", 26, rpio.HIGH ], //client on
               [ "w", 19, rpio.LOW ], //MOSI 1st bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 2nd bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 3rd bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 4th bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 5th bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 6th bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 7th bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 8th bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "w", 26, rpio.LOW ] //client off
            ]
            assert.deepEqual(rpio.result.comm, expected)
         })
         after(function(){
            secondClient.close()
         })
      })
   })
   
   describe("#read", function(){
      describe("-firstClient", function(){
         before(function(){
            rpio.reset()
            firstClient.open()
         })
         it("should read the reversed test byte in correct way", function(){
            let bytes = firstClient.read(1)
            let expected = [
               [ "w", 24, rpio.LOW ], //client on
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 1st bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 2nd bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 3rd bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 4th bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 5th bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 6th bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 7th bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 8th bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 24, rpio.HIGH ] //client off
            ]
            assert.deepEqual(rpio.result.comm, expected)
            assert.equal(bytes[0], 0x53) //test byte reversed: 01010011
         })
         after(function(){
            firstClient.close()
         })
      })
      
      describe("-secondClient", function(){
         before(function(){
            rpio.reset()
            secondClient.open()
         })
         it("should read the test byte in correct way", function(){
            let bytes = secondClient.read(1)
            let expected = [
               [ "w", 26, rpio.HIGH ], //client on
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "r", 21 ], //MISO 1st bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "r", 21 ], //MISO 2nd bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "r", 21 ], //MISO 3rd bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "r", 21 ], //MISO 4th bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "r", 21 ], //MISO 5th bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "r", 21 ], //MISO 6th bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "r", 21 ], //MISO 7th bit
               [ "w", 23, rpio.LOW ], //clock on
               [ "w", 23, rpio.HIGH ], //clock off
               [ "r", 21 ], //MISO 8th bit
               [ "w", 26, rpio.LOW ] //client off
            ]
            assert.deepEqual(rpio.result.comm, expected)
            assert.equal(bytes[0], 0xca)
         })
         after(function(){
            secondClient.close()
         })
      })
   })
   
   describe("#transfer", function(){
      describe("-slave", function(){
         it("should throw an exception, because invalidity", function(){
            slave.close() //get sure it"s invalid
            assert.throws( () => { slave.transfer([0xca]) },
                           /Not initialized/)
         })
         it("should throw an exception, because missing MISO", function(){
            slave.open()
            assert.throws( () => { slave.transfer([0xca]) }, //read = true
                           /No input pin defined/)
            slave.close()
         })
         it("should throw an exception, because missing MOSI", function(){
            slave.open()
            assert.throws( () => { slave.transfer([0xca], false) }, //write = true
                           /No output pin defined/)
            slave.close()
         })
         it("should work although there is no communication", function(){
            slave.open()
            let bytes = slave.transfer([0xca], false, false)
            assert.equal(bytes[0], 0x00)
            slave.close()
         })
      })
      
      describe("-firstClient", function(){
         before(function(){
            rpio.reset()
            firstClient.open()
         })
         it("should transfer test byte in correct way", function(){
            let bytes = firstClient.transfer([0xca])
            let expected = [ //we walk from left to right in the byte
               [ "w", 24, rpio.LOW ], //client on
               [ "w", 19, rpio.HIGH ], //MOSI 1st bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 1st bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 2nd bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 2nd bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 3rd bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 3rd bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 4th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 4th bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 5th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 5th bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 6th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 6th bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.HIGH ], //MOSI 7th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 7th bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 19, rpio.LOW ], //MOSI 8th bit
               [ "w", 23, rpio.HIGH ], //clock on
               [ "r", 21 ], //MISO 8th bit
               [ "w", 23, rpio.LOW ], //clock off
               [ "w", 24, rpio.HIGH ] //client off
            ]
            assert.deepEqual(rpio.result.comm, expected)
            assert.equal(bytes[0], 0x53) //test byte reversed: 01010011
         })
         after(function(){
            firstClient.close()
         })
      })
   })
})