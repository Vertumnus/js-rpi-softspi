/* 
 * Copyright Armin Junge
 */

/* global Uint8Array */

var rpio = require("rpio")

/**
 * Represents a SPI (Serial Peripheral Interface) using user defined pins.
 * So it is a software solution instead of using the hardware SPI.
 * The class implements the SPI protocol ({@link https://en.wikipedia.org/wiki/Serial_Peripheral_Interface_Bus}),
 * but currently without a frequency support.
 */
class SoftSPI
{
   /**
    * Creates a new SPI instance for a slave device.
    * @param {Object} options
    * @param {Number} options.clock - Pin for clock (SCLK) 
    * @param {Number} [options.miso] - Pin for master input slave output (MISO)
    * @param {Number} [options.mosi] - Pin for master output slave input (MOSI)
    * @param {Number} [options.client] - Pin for client select (CS) 
    * @param {Number} [options.clientSelect=LOW (0)] - Clients needed polarity for activation
    * @param {Number} [options.mode=0] - SPI mode (0 - 3)
    * @param {Number} [options.bitOrder=MSB (1)] - Most Significant Bit (MSB = 1) or Least Significant Bit (LSB = 0)
    * @returns {SoftSPI}
    */
   constructor(options)
   {
      this.ClkPhase = { First:0, Second:1 }
      this.ClkTrigger = { High:0, Low:2 }

      this.assert(options.clock > 0, "Clock pin must be specified") // mandatory field "clock" filled?
      this.default = {
         clock: null,
         miso: null,
         mosi: null,
         client: null,
         clientSelect: rpio.LOW,
         mode: 0,
         bitOrder: SoftSPI.MSB
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

   /**
    * Most Significant Bit (= 1)
    * @constant
    */
   static get MSB()
   {
      return 1
   }
   /**
    * Least Significatn Bit (= 0)
    * @constant
    */
   static get LSB()
   {
      return 0
   }

   /**
    * Helper method for the assertion of the given expression. 
    * If the expression is false, the method throws the given message as exception.
    * @private
    * @param {Boolean} expression - any logical expression
    * @param {String} message - text, which will be thrown as exception
    * @returns {undefined}
    */
   assert(expression, message)
   {
      if(!expression)
         throw message
   }

   /**
    * Sets the SPI mode.
    * @param {Number} value - SPI Mode
    * @returns {undefined}
    */
   set mode(value)
   {
      /*
         Mode = Clock Polarity | Clock Phase
          0   =   0            |  0
          1   =   0            |  1
          2   =   1            |  0
          3   =   1            |  1
      */
      this.assert(value >= 0 && value <= 3, "Mode " + value + " not supported")
      this._mode = value
      this.clockPhase = value & this.ClkPhase.Second
      this.clockTrigger = (value & this.ClkTrigger.Low)?rpio.LOW:rpio.HIGH

      this.valid = false
   }
   /**
    * Returns the SPI mode.
    * @returns {Number}
    */
   get mode()
   {
      return this._mode
   }

   /**
    * Sets the bit order at transfering data.
    * @param {Number} order - MSB (1) or LSB (0)
    * @returns {undefined}
    */
   set bitOrder(order)
   {
      if(order === SoftSPI.MSB){
         this._bitOrder = SoftSPI.MSB
         this.bitMask = 0x80
         this.writeShift = SoftSPI.shiftLeft
         this.readShift = SoftSPI.shiftRight
      }
      else{
         this._bitOrder = SoftSPI.LSB
         this.bitMask = 0x01
         this.writeShift = SoftSPI.shiftRight
         this.readShift = SoftSPI.shiftLeft
      }

      this.valid = false
   }
   /**
    * Returns the bit order.
    * @returns {Number}
    */
   get bitOrder()
   {
      return this._bitOrder
   }

   /**
    * Static helper method to get pin value (LOW = 0 or HIGH = 1) from given any value.
    * @private
    * @param {Any} value
    * @returns {Number}
    */
   static pinVal(value)
   {
      return (value)?rpio.HIGH:rpio.LOW
   }

   /**
    * Returns the pin value for triggering clock on.
    * @private
    * @returns {Number}
    */
   get clockOn()
   {
      return SoftSPI.pinVal(this.clockTrigger)
   }
   /**
    * Returns the pin value for triggering clock off.
    * @private
    * @returns {Number}
    */
   get clockOff()
   {
      return SoftSPI.pinVal(!this.clockTrigger)
   }
   
   /**
    * Returns the pin value for triggering client on.
    * @private
    * @returns {Number}
    */
   get clientOn()
   {
      return SoftSPI.pinVal(this.clientSelect)
   }
   /**
    * Returns the pin value for triggering client off.
    * @private
    * @returns {Number}
    */
   get clientOff()
   {
      return SoftSPI.pinVal(!this.clientSelect)
   }

   /**
    * Opens the connection to the client by setting up the pins.
    * @returns {SoftSPI}
    */
   open()
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

   /**
    * Activates client to start communication.
    * @private
    * @returns {undefined}
    */
   activateClient()
   {
      if(this.client)
         rpio.write(this.client, this.clientOn)
   }

   /**
    * Deactivates client to finish communication.
    * @private
    * @returns {undefined}
    */
   deactivateClient()
   {
      if(this.client)
         rpio.write(this.client, this.clientOff)
   }

   /**
    * Reads the number of bytes from client and supplies them as an array.
    * @param {Number} bytes - Number of bytes to read
    * @returns {Array}
    */
   read(bytes)
   {
      return this.transfer(new Uint8Array(bytes), true, false)
   }

   /**
    * Writes the given data to the client.
    * @param {Any} data
    * @returns {SoftSPI}
    */
   write(data)
   {
      this.transfer(data, false, true)
      return this
   }

   /**
    * Transfers a single bit to and from the client. 
    * The given byte and the given offset indicate the to be written bit.
    * Returns the read bit.
    * @private
    * @param {Byte} byte - Current byte for transfer to the client
    * @param {Number} offset - Offset of the affected bit in the byte
    * @param {Boolean} read - Read a bit from the client
    * @param {Boolean} write - Write a bit to the client
    * @returns {Number}
    */
   transferBit(byte, offset, read, write)
   {
      let res = 0
      if(write)
         rpio.write(this.mosi, SoftSPI.pinVal(this.writeShift(byte, offset) & this.bitMask))
      rpio.write(this.clock, this.clockOn)
      if(read && this.clockPhase === this.ClkPhase.First)
         res = rpio.read(this.miso)
      rpio.write(this.clock, this.clockOff)
      if(read && this.clockPhase === this.ClkPhase.Second)
         res = rpio.read(this.miso)
      return res
   }

   /**
    * Transfers a single byte to and from the client.
    * @private
    * @param {Byte} byte - Current byte for transfer to the client
    * @param {Boolean} read - Read a byte from the client
    * @param {Boolean} write - Write a byte to the client
    * @returns {Byte}
    */
   transferByte(byte, read, write){
      let res = 0
      for(let b = 0; b < 8; ++b)
         if(this.transferBit(byte, b, read, write))
            res |= this.readShift(this.bitMask, b) //set bit to 1
         else
            res &= ~this.readShift(this.bitMask, b) //set bit to 0
      
      return res
   }

   /**
    * Transfers the given data to the client and returns data from the client.
    * The given data can be any data, which is transformable to a byte array.
    * Returns the read data from the client as an array. Each element is one byte.
    * The read data has exactly the same number of bytes like the written data.
    * @param {Any} data
    * @param {Boolean} [read=true] - Read data from the client
    * @param {Boolean} [write=true] - Write data to the client
    * @returns {Array}
    */
   transfer(data, read = true, write = true) // write and read
   {
      this.assert(this.valid, "Not initialized")
      this.assert(!read || this.miso, "No input pin defined")
      this.assert(!write || this.mosi, "No output pin defined")

      let trans = Uint8Array.from(data)
      let result = []

      this.activateClient()
 
      for(let byte of trans)
         result.push(this.transferByte(byte, read, write))

      this.deactivateClient()

      return result
   }

   /**
    * Closes the connection to the client by closing the pins.
    * @returns {SoftSPI}
    */
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

   /**
    * Static helper method to make a bit shift to the left.
    * @private
    * @param {Byte} value
    * @param {Number} offset
    * @returns {Byte}
    */
   static shiftLeft(value, offset)
   {
      return value << offset
   }

   /**
    * Static helper method to make a bit shift to the right.
    * @private
    * @param {Byte} value
    * @param {Number} offset
    * @returns {Byte}
    */
   static shiftRight(value, offset)
   {
      return value >> offset
   }
}

module.exports = SoftSPI
