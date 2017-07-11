/* 
 * Copyright Armin Junge
 */


var mock = require('mock-require')
mock('rpio', {
   LOW: 0,
   HIGH: 1,
   INPUT: 'I',
   OUTPUT: 'O',
   open: function(...args){
      this.result.open.push(args)
   },
   close: function(...args){
      this.result.close.push(args)
   },
   write: function(...args){
      args.unshift('w')
      this.result.comm.push(args)
   },
   read: function(...args){
      args.unshift('r')
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

var rpio = require('rpio')
var spi = require('../lib/rpi-softspi.min.js')

module.exports.test = {
   setUp: function(cb){
      this.firstClient = new spi({
         clock: 23,
         miso: 21,
         mosi: 19,
         client: 24
      })
      this.secondClient = new spi({
         clock: 23,
         miso: 21,
         mosi: 19,
         client: 26,
         clientSelect: 1, //HIGH
         mode: 3,
         bitOrder: spi.LSB
      })
      this.slave = new spi({ clock: 5 })
      cb()
   },
   testConstructor: function(test){
      test.expect(4)
      
      try{
         let slave = new spi({})
         test.ok(false, "Exception expected, because mandatory clock pin is not specified")
      }
      catch(e){}
      
      test.equal(this.slave.clock, 5, "Clock pin is not set")
      test.equal(this.slave.clientSelect, 0, "Member clientSelect has wrong default value")
      test.equal(this.slave.mode, 0, "Member mode has wrong default value")
      test.equal(this.slave.bitOrder, spi.MSB, "Member bitOrder has wrong default value")
      
      test.done()
   },
   testOpenAndClose: function(test){
      test.expect(10)
      /*
       * First case with slave, which has only the clock pin defined
       */
      rpio.reset()
      this.slave.open()
      let expected = [
         [ 5, rpio.OUTPUT, rpio.LOW ]
      ]
      test.deepEqual(rpio.result.open, expected, "Opening of slave went wrong")
      test.ok(this.slave.valid, "Slave is not valid")
      
      this.slave.close()
      expected = [
         [ 5 ]
      ]
      test.deepEqual(rpio.result.close, expected, "Closing of slave went wrong")
      test.ok(!this.slave.valid, "Slave must not be valid")
      
      /*
       * Second case with the first client, which has all pins defined and
       * default configuration
       */
      rpio.reset()
      this.firstClient.open()
      expected = [
         [ 23, rpio.OUTPUT, rpio.LOW ],
         [ 24, rpio.OUTPUT, rpio.HIGH ],
         [ 19, rpio.OUTPUT, rpio.LOW ],
         [ 21, rpio.INPUT ]
      ]
      test.deepEqual(rpio.result.open, expected, "Opening of first client went wrong")
      test.ok(this.firstClient.valid, "First client is not valid")
      
      this.firstClient.close()
      expected = [
         [ 21 ],
         [ 19 ],
         [ 23 ],
         [ 24 ]
      ]
      test.deepEqual(rpio.result.close, expected, "Closing of first client went wrong")
      test.ok(!this.firstClient.valid, "First client must not be valid")
      
      /*
       * Third case with second client, which has all pins defined and
       * a special configuration
       * consider: only the opening remains as relevant now
       */
      rpio.reset()
      this.secondClient.open()
      expected = [
         [ 23, rpio.OUTPUT, rpio.HIGH ],
         [ 26, rpio.OUTPUT, rpio.LOW ],
         [ 19, rpio.OUTPUT, rpio.LOW ],
         [ 21, rpio.INPUT ]
      ]
      test.deepEqual(rpio.result.open, expected, "Opening of second client went wrong")
      test.ok(this.secondClient.valid, "Second client is not valid")
      this.secondClient.close()
      
      test.done()
   },
   testWrite: function(test){
      test.expect(2)
      
      rpio.reset()
      this.firstClient.open()
      this.firstClient.write([0xca]) //bin: 11001010
      let expected = [ //we walk from left to right in the byte
         [ 'w', 24, rpio.LOW ], //client on
         [ 'w', 19, rpio.HIGH ], //MOSI 1st bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.HIGH ], //MOSI 2nd bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.LOW ], //MOSI 3rd bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.LOW ], //MOSI 4th bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.HIGH ], //MOSI 5th bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.LOW ], //MOSI 6th bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.HIGH ], //MOSI 7th bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.LOW ], //MOSI 8th bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 24, rpio.HIGH ] //client off
      ]
      test.deepEqual(rpio.result.comm, expected, "Write to first client is incorrect")
      this.firstClient.close()
      
      rpio.reset()
      this.secondClient.open()
      this.secondClient.write([0xca]) //bin: 11001010
      expected = [ //we walk from right to left in the byte
         [ 'w', 26, rpio.HIGH ], //client on
         [ 'w', 19, rpio.LOW ], //MOSI 1st bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'w', 19, rpio.HIGH ], //MOSI 2nd bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'w', 19, rpio.LOW ], //MOSI 3rd bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'w', 19, rpio.HIGH ], //MOSI 4th bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'w', 19, rpio.LOW ], //MOSI 5th bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'w', 19, rpio.LOW ], //MOSI 6th bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'w', 19, rpio.HIGH ], //MOSI 7th bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'w', 19, rpio.HIGH ], //MOSI 8th bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'w', 26, rpio.LOW ] //client off
      ]
      test.deepEqual(rpio.result.comm, expected, "Write to second client is incorrect")
      this.secondClient.close()
      
      test.done()
   },
   testRead: function(test){
      test.expect(4)
      
      rpio.reset()
      this.firstClient.open()
      let bytes = this.firstClient.read(1)
      let expected = [
         [ 'w', 24, rpio.LOW ], //client on
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 1st bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 2nd bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 3rd bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 4th bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 5th bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 6th bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 7th bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 8th bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 24, rpio.HIGH ] //client off
      ]
      test.deepEqual(rpio.result.comm, expected, "Read from first client doesn't work")
      test.equal(bytes[0], 0x53, "First client delivers wrong byte") //test byte reversed: 01010011
      this.firstClient.close()
      
      rpio.reset()
      this.secondClient.open()
      bytes = this.secondClient.read(1)
      expected = [
         [ 'w', 26, rpio.HIGH ], //client on
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'r', 21 ], //MISO 1st bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'r', 21 ], //MISO 2nd bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'r', 21 ], //MISO 3rd bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'r', 21 ], //MISO 4th bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'r', 21 ], //MISO 5th bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'r', 21 ], //MISO 6th bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'r', 21 ], //MISO 7th bit
         [ 'w', 23, rpio.LOW ], //clock on
         [ 'w', 23, rpio.HIGH ], //clock off
         [ 'r', 21 ], //MISO 8th bit
         [ 'w', 26, rpio.LOW ] //client off
      ]
      test.deepEqual(rpio.result.comm, expected, "Read from second client doesn't work")
      test.equal(bytes[0], 0xca, "Second client delivers wrong byte")
      this.secondClient.close()
      
      test.done()
   },
   testTransfer: function(test){
      test.expect(2)
      
      this.slave.close()
      try{
         this.slave.transfer([0xca])
         test.ok(false, "Exception expected, because invalidity of slave")
      }
      catch(e){}
      
      this.slave.open()
      try{
         this.slave.transfer([0xca]) //read = true
         test.ok(false, "Exception expected, because missing MISO")
      }
      catch(e){}
      try{
         this.slave.transfer([0xca], false) //write = true
         test.ok(false, "Exception expected, because missing MOSI")
      }
      catch(e){}
      
      rpio.reset()
      this.firstClient.open()
      let bytes = this.firstClient.transfer([0xca])
      let expected = [ //we walk from left to right in the byte
         [ 'w', 24, rpio.LOW ], //client on
         [ 'w', 19, rpio.HIGH ], //MOSI 1st bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 1st bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.HIGH ], //MOSI 2nd bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 2nd bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.LOW ], //MOSI 3rd bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 3rd bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.LOW ], //MOSI 4th bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 4th bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.HIGH ], //MOSI 5th bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 5th bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.LOW ], //MOSI 6th bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 6th bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.HIGH ], //MOSI 7th bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 7th bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 19, rpio.LOW ], //MOSI 8th bit
         [ 'w', 23, rpio.HIGH ], //clock on
         [ 'r', 21 ], //MISO 8th bit
         [ 'w', 23, rpio.LOW ], //clock off
         [ 'w', 24, rpio.HIGH ] //client off
      ]
      test.deepEqual(rpio.result.comm, expected, "Transfer with first client doesn't work")
      test.equal(bytes[0], 0x53, "First client transfers back wrong byte") //test byte reversed: 01010011
      this.firstClient.close()
      
      test.done()
   }
}