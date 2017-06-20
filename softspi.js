/* 
 * Copyright Armin Junge
 */


/* global Int8Array */

var rpio = require("rpio")

class SoftSPI
{
   constructor(options)
   {
      this.MSB = 1
      this.LSB = 0
      this.ClkPhase = { First:0, Second:1 }
      this.ClkTrigger = { High:0, Low:2 }

      console.assert(options.clock > 0, this, options) // mandatory field "clock" filled?
      this.default = {
         clock: null,
         miso: null,
         mosi: null,
         client: null,
         clientSelect: rpio.LOW,
         mode: 0,
         bitOrder: this.MSB
      }
      options = Object.assign([], this.default, options)
      this.clock = options.clock
      this.miso = options.miso
      this.mosi = options.mosi
      this.client = options.client
      this.clientSelect = options.clientSelect
      this.mode = options.mode
      this.bitOrder = options.bitOrder
      this.valid = false
   }

   set mode(value)
   {
      /*
         Mode = Clock Polarity | Clock Phase
          0       =   0                   |  0
          1       =   0                   |  1
          2       =   1                   |  0
          3       =   1                   |  1
      */
      console.assert(value >= 0 && value <= 3, "Mode %d not supported", value)
      this.clockPhase = value & this.ClkPhase.Second
      this.clockTrigger = (value & this.ClkTrigger.Low)?rpio.LOW:rpio.HIGH

      this.valid = false
   }

   set bitOrder(order)
   {
      if(order == this.MSB)
      {
         this.bitMask = 0x80
         this.writeShift = SoftSPI.shiftLeft
         this.readShift = SoftSPI.shiftRight
      }
      else
      {
         this.bitMask = 0x01
         this.writeShift = SoftSPI.shiftRight
         this.readShift = SoftSPI.shiftLeft
      }

      this.valid = false
   }

   static pinVal(value)
   {
      return (value)?rpio.HIGH:rpio.LOW
   }

   get clockOn()
   {
      return SoftSPI.pinVal(this.clockTrigger)
   }
   get clockOff()
   {
      return SoftSPI.pinVal(!this.clockTrigger)
   }
   
   get clientOn()
   {
      return SoftSPI.pinVal(this.clientSelect)
   }
   get clientOff()
   {
      return SoftSPI.pinVal(!this.clientSelect)
   }

   init()
   {
      rpio.open(this.clock, rpio.OUTPUT, this.clockOff )
      if(this.client)
         rpio.open(this.client, rpio.OUTPUT, this.clientOff )
      if(this.mosi)
         rpio.open(this.mosi, rpio.OUTPUT, rpio.LOW)
      if(this.miso)
         rpio.open(this.miso, rpio.INPUT)
      this.valid = true
      return this
   }

   activateClient()
   {
      if(this.client)
         rpio.write(this.client, this.clientOn)
   }

   deactivateClient()
   {
      if(this.client)
         rpio.write(this.client, this.clientOff)
   }

   read(bytes)
   {
      return this.transfer(Int8Array(bytes), true, false)
   }

   write(data)
   {
      this.transfer(data, false, true)
   }

   transferBit(byte, offset, read, write)
   {
      let res = 0
      if(write)
         rpio.write(this.mosi, SoftSPI.pinVal(this.writeShift(byte, offset) & this.bitMask))
      rpio.write(this.clock, this.clockOn)
      if(read && this.clockPhase == this.ClkPhase.First)
         res = rpio.read(this.miso)
      rpio.write(this.clock, this.clockOff)
      if(read && this.clockPhase == this.ClkPhase.Second)
         res = rpio.read(this.miso)
      return res
   }

   transfer(data, read = true, write = true) // write and read
   {
      console.assert(this.valid, "Not initialized")
      console.assert(!read || this.miso, "No input pin defined")
      console.assert(!write || this.mosi, "No output pin defined")

      let trans = Int8Array.from(data)

      this.activateClient()
 
      for(let byte of trans)
      {
         let res = 0
         for(let b = 0; b < 8; ++b)
         {
            if(this.transferBit(byte, b, read, write))
               res |= this.readShift(this.bitMask, b)
            else
               res &= ~this.readShift(this.bitMask, b)
         }
         byte = res
      }

      this.deactivateClient()

      return Array.from(trans)
   }

   close()
   {
      if(this.miso)
         rpio.close(this.miso)
      if(this.mosi)
         rpio.close(this.mosi)
      rpio.close(this.clock)
      if(this.client)
         rpio.close(this.client)
      this.valid = false
      return this
   }

   static shiftLeft(value, offset)
   {
      return value << offset
   }

   static shiftRight(value, offset)
   {
      return value >> offset
   }
}

module.exports = SoftSPI
