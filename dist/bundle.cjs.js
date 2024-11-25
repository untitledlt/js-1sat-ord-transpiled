'use strict';

/**
 * JavaScript numbers are only precise up to 53 bits. Since Bitcoin relies on
 * 256-bit cryptography, this BigNumber class enables operations on larger
 * numbers.
 *
 * @class BigNumber
 */
class BigNumber {
    /**
     * @privateinitializer
     */
    static zeros = [
        '',
        '0',
        '00',
        '000',
        '0000',
        '00000',
        '000000',
        '0000000',
        '00000000',
        '000000000',
        '0000000000',
        '00000000000',
        '000000000000',
        '0000000000000',
        '00000000000000',
        '000000000000000',
        '0000000000000000',
        '00000000000000000',
        '000000000000000000',
        '0000000000000000000',
        '00000000000000000000',
        '000000000000000000000',
        '0000000000000000000000',
        '00000000000000000000000',
        '000000000000000000000000',
        '0000000000000000000000000'
    ];
    /**
     * @privateinitializer
     */
    static groupSizes = [
        0, 0,
        25, 16, 12, 11, 10, 9, 8,
        8, 7, 7, 7, 7, 6, 6,
        6, 6, 6, 6, 6, 5, 5,
        5, 5, 5, 5, 5, 5, 5,
        5, 5, 5, 5, 5, 5, 5
    ];
    /**
     * @privateinitializer
     */
    static groupBases = [
        0, 0,
        33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
        43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
        16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
        6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
        24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
    ];
    /**
     * The word size of big number chunks.
     *
     * @property wordSize
     *
     * @example
     * console.log(BigNumber.wordSize);  // output: 26
     */
    static wordSize = 26;
    /**
     * Negative flag. Indicates whether the big number is a negative number.
     * - If 0, the number is positive.
     * - If 1, the number is negative.
     *
     * @property negative
     *
     * @example
     * let num = new BigNumber("-10");
     * console.log(num.negative);  // output: 1
     */
    negative;
    /**
     * Array of numbers, where each number represents a part of the value of the big number.
     *
     * @property words
     *
     * @example
     * let num = new BigNumber(50000);
     * console.log(num.words);  // output: [ 50000 ]
     */
    words;
    /**
     * Length of the words array.
     *
     * @property length
     *
     * @example
     * let num = new BigNumber(50000);
     * console.log(num.length);  // output: 1
     */
    length;
    /**
     * Reduction context of the big number.
     *
     * @property red
     */
    red;
    /**
     * Checks whether a value is an instance of BigNumber. If not, then checks the features of the input to determine potential compatibility. Regular JS numbers fail this check.
     *
     * @method isBN
     * @param num - The value to be checked.
     * @returns - Returns a boolean value determining whether or not the checked num parameter is a BigNumber.
     *
     * @example
     * const validNum = new BigNumber(5);
     * BigNumber.isBN(validNum); // returns true
     *
     * const invalidNum = 5;
     * BigNumber.isBN(invalidNum); // returns false
     */
    static isBN(num) {
        if (num instanceof BigNumber) {
            return true;
        }
        return num !== null && typeof num === 'object' &&
            num.constructor.wordSize === BigNumber.wordSize &&
            Array.isArray(num.words);
    }
    /**
     * Returns the bigger value between two BigNumbers
     *
     * @method max
     * @param left - The first BigNumber to be compared.
     * @param right - The second BigNumber to be compared.
     * @returns - Returns the bigger BigNumber between left and right.
     *
     * @example
     * const bn1 = new BigNumber(5);
     * const bn2 = new BigNumber(10);
     * BigNumber.max(bn1, bn2); // returns bn2
     */
    static max(left, right) {
        if (left.cmp(right) > 0)
            return left;
        return right;
    }
    /**
     * Returns the smaller value between two BigNumbers
     *
     * @method min
     * @param left - The first BigNumber to be compared.
     * @param right - The second BigNumber to be compared.
     * @returns - Returns the smaller value between left and right.
     *
     * @example
     * const bn1 = new BigNumber(5);
     * const bn2 = new BigNumber(10);
     * BigNumber.min(bn1, bn2); // returns bn1
     */
    static min(left, right) {
        if (left.cmp(right) < 0)
            return left;
        return right;
    }
    /**
     * @constructor
     *
     * @param number - The number (various types accepted) to construct a BigNumber from. Default is 0.
     *
     * @param base - The base of number provided. By default is 10.
     *
     * @param endian - The endianness provided. By default is 'big endian'.
     *
     * @example
     * import BigNumber from './BigNumber';
     * const bn = new BigNumber('123456', 10, 'be');
     */
    constructor(number = 0, base = 10, endian = 'be') {
        this.negative = 0;
        this.words = [];
        this.length = 0;
        // Reduction context
        this.red = null;
        if (number !== null) {
            if (base === 'le' || base === 'be') {
                endian = base;
                base = 10;
            }
            if (typeof number === 'number') {
                return this.initNumber(number, base, endian);
            }
            if (typeof number === 'object') {
                return this.initArray(number, endian);
            }
            if (base === 'hex') {
                base = 16;
            }
            this.assert(base === (base | 0) && base >= 2 && base <= 36);
            number = number.toString().replace(/\s+/g, '');
            let start = 0;
            if (number[0] === '-') {
                start++;
                this.negative = 1;
            }
            if (start < number.length) {
                if (base === 16) {
                    this.parseHex(number, start, endian);
                }
                else {
                    this.parseBase(number, base, start);
                    if (endian === 'le') {
                        this.initArray(this.toArray(), endian);
                    }
                }
            }
        }
    }
    /**
     * Asserts that a certain condition is true. If it is not, throws an error with the provided message.
     *
     * @method assert
     * @private
     * @param val - The condition to be checked.
     * @param msg - The error message to throw if the condition is not satisfied. Default is 'Assertion failed'.
     */
    assert(val, msg = 'Assertion failed') {
        if (!val)
            throw new Error(msg);
    }
    /**
     * Function to initialize a BigNumber from a regular number. It also determines if the number is negative and sets the negative property accordingly.
     * If the endianness provided is little endian ('le'), it reverses the bytes.
     *
     * @method initNumber
     * @private
     * @param number - The number to initialize the BigNumber from.
     * @param base - The base of the number provided.
     * @param endian - The endianness ('be' for big-endian, 'le' for little-endian).
     * @returns The current BigNumber instance.
     */
    initNumber(number, base, endian) {
        if (number < 0) {
            this.negative = 1;
            number = -number;
        }
        if (number < 0x4000000) {
            this.words = [number & 0x3ffffff];
            this.length = 1;
        }
        else if (number < 0x10000000000000) {
            this.words = [
                number & 0x3ffffff,
                (number / 0x4000000) & 0x3ffffff
            ];
            this.length = 2;
        }
        else {
            this.assert(number < 0x20000000000000, 'The number is larger than 2 ^ 53 (unsafe)');
            this.words = [
                number & 0x3ffffff,
                (number / 0x4000000) & 0x3ffffff,
                1
            ];
            this.length = 3;
        }
        if (endian !== 'le')
            return this;
        // Reverse the bytes
        this.initArray(this.toArray(), endian);
        return this;
    }
    /**
     * Creates a new BigNumber from the provided number array and initializes it based on the base and endian provided.
     *
     * @method initArray
     * @private
     * @param number - The array of numbers to initialize the BigNumber from. Each number represents a part of the value of the big number.
     * @param endian - The endianness ('be' for big-endian, 'le' for little-endian).
     * @return The current BigNumber instance.
     */
    initArray(number, endian) {
        // Perhaps a Uint8Array
        this.assert(typeof number.length === 'number', 'The number must have a length');
        if (number.length <= 0) {
            this.words = [0];
            this.length = 1;
            return this;
        }
        this.length = Math.ceil(number.length / 3);
        this.words = new Array(this.length);
        let i = 0;
        for (; i < this.length; i++) {
            this.words[i] = 0;
        }
        let j, w;
        let off = 0;
        if (endian === 'be') {
            for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
                w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
                this.words[j] |= (w << off) & 0x3ffffff;
                this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
                off += 24;
                if (off >= 26) {
                    off -= 26;
                    j++;
                }
            }
        }
        else if (endian === 'le') {
            for (i = 0, j = 0; i < number.length; i += 3) {
                w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
                this.words[j] |= (w << off) & 0x3ffffff;
                this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
                off += 24;
                if (off >= 26) {
                    off -= 26;
                    j++;
                }
            }
        }
        return this.strip();
    }
    /**
     * Function to extract the 4-bit number from a hexadecimal character
     *
     * @method parseHex4Bits
     * @private
     * @param string - The string containing the hexadecimal character.
     * @param index - The index of the hexadecimal character in the string.
     * @return The decimal value corresponding to the hexadecimal character.
     */
    parseHex4Bits(string, index) {
        const c = string.charCodeAt(index);
        // '0' - '9'
        if (c >= 48 && c <= 57) {
            return c - 48;
            // 'A' - 'F'
        }
        else if (c >= 65 && c <= 70) {
            return c - 55;
            // 'a' - 'f'
        }
        else if (c >= 97 && c <= 102) {
            return c - 87;
        }
        else {
            throw new Error('Invalid character in ' + string);
        }
    }
    /**
     * Function to extract the 8-bit number from two hexadecimal characters
     *
     * @method parseHexByte
     * @private
     * @param string - The string containing the hexadecimal characters.
     * @param lowerBound - The lower bound of the index to start parsing from.
     * @param index - The index of the second hexadecimal character in the string.
     * @return The decimal value corresponding to the two hexadecimal characters.
     */
    parseHexByte(string, lowerBound, index) {
        let r = this.parseHex4Bits(string, index);
        if (index - 1 >= lowerBound) {
            r |= this.parseHex4Bits(string, index - 1) << 4;
        }
        return r;
    }
    /**
     * Function to parse and convert a specific string portion into a big number in hexadecimal base.
     *
     * @method parseHex
     * @private
     * @param number - The string to parse.
     * @param start - The index to start parsing from.
     * @param endian - The endianness ('be', 'le').
     * @return The current BigNumber instance.
     */
    parseHex(number, start, endian) {
        // Create possibly bigger array to ensure that it fits the number
        this.length = Math.ceil((number.length - start) / 6);
        this.words = new Array(this.length);
        let i = 0;
        for (; i < this.length; i++) {
            this.words[i] = 0;
        }
        // 24-bits chunks
        let off = 0;
        let j = 0;
        let w;
        if (endian === 'be') {
            for (i = number.length - 1; i >= start; i -= 2) {
                w = this.parseHexByte(number, start, i) << off;
                this.words[j] |= w & 0x3ffffff;
                if (off >= 18) {
                    off -= 18;
                    j += 1;
                    this.words[j] |= w >>> 26;
                }
                else {
                    off += 8;
                }
            }
        }
        else {
            const parseLength = number.length - start;
            for (i = parseLength % 2 === 0 ? start + 1 : start; i < number.length; i += 2) {
                w = this.parseHexByte(number, start, i) << off;
                this.words[j] |= w & 0x3ffffff;
                if (off >= 18) {
                    off -= 18;
                    j += 1;
                    this.words[j] |= w >>> 26;
                }
                else {
                    off += 8;
                }
            }
        }
        return this.strip();
    }
    /**
     * Function to convert a particular string portion into a base word.
     *
     * @method parseBaseWord
     * @private
     * @param str - The string to parse.
     * @param start - The index to start parsing from.
     * @param end - The index to stop parsing at.
     * @param mul - The base to be used for the conversion.
     * @return The decimal value of the parsed base word.
     */
    parseBaseWord(str, start, end, mul) {
        let r = 0;
        let b = 0;
        const len = Math.min(str.length, end);
        for (let i = start; i < len; i++) {
            const c = str.charCodeAt(i) - 48;
            r *= mul;
            // 'a'
            if (c >= 49) {
                b = c - 49 + 0xa;
                // 'A'
            }
            else if (c >= 17) {
                b = c - 17 + 0xa;
                // '0' - '9'
            }
            else {
                b = c;
            }
            this.assert(c >= 0 && b < mul, 'Invalid character');
            r += b;
        }
        return r;
    }
    /**
     * Function to convert a string into a big number in a specific base.
     *
     * @method parseBase
     * @private
     * @param number - The string to be converted into a big number.
     * @param base - The base to be used for conversion.
     * @param start - The index to start conversion from.
     * @return The current BigNumber instance.
     */
    parseBase(number, base, start) {
        // Initialize as zero
        this.words = [0];
        this.length = 1;
        // Find length of limb in base
        let limbLen = 0;
        let limbPow = 1;
        for (; limbPow <= 0x3ffffff; limbPow *= base) {
            limbLen++;
        }
        limbLen--;
        limbPow = (limbPow / base) | 0;
        const total = number.length - start;
        const mod = total % limbLen;
        const end = Math.min(total, total - mod) + start;
        let word = 0;
        let i = start;
        for (; i < end; i += limbLen) {
            word = this.parseBaseWord(number, i, i + limbLen, base);
            this.imuln(limbPow);
            if (this.words[0] + word < 0x4000000) {
                this.words[0] += word;
            }
            else {
                this._iaddn(word);
            }
        }
        if (mod !== 0) {
            let pow = 1;
            word = this.parseBaseWord(number, i, number.length, base);
            for (i = 0; i < mod; i++) {
                pow *= base;
            }
            this.imuln(pow);
            if (this.words[0] + word < 0x4000000) {
                this.words[0] += word;
            }
            else {
                this._iaddn(word);
            }
        }
        return this.strip();
    }
    /**
     * The copy method copies the state of this BigNumber into an exsiting `dest` BigNumber.
     *
     * @method copy
     * @param dest - The BigNumber instance that will be updated to become a copy.
     *
     * @example
     * const bn1 = new BigNumber('123456', 10, 'be');
     * const bn2 = new BigNumber();
     * bn1.copy(bn2);
     * // bn2 is now a BigNumber representing 123456
     */
    copy(dest) {
        dest.words = new Array(this.length);
        for (let i = 0; i < this.length; i++) {
            dest.words[i] = this.words[i];
        }
        dest.length = this.length;
        dest.negative = this.negative;
        dest.red = this.red;
    }
    /**
     *
     * Directly transfers the attributes of the source BigNumber to the destination BigNumber.
     *
     * @method move
     * @param dest - The BigNumber that attributes will be moved into.
     * @param src - The BigNumber that attributes will be moved from.
     *
     * @example
     * const src = new BigNumber('123456', 10, 'be');
     * const dest = new BigNumber();
     * BigNumber.move(dest, src);
     * // dest is now a BigNumber representing 123456
     */
    static move(dest, src) {
        dest.words = src.words;
        dest.length = src.length;
        dest.negative = src.negative;
        dest.red = src.red;
    }
    /**
     * Creates a copy of the current BigNumber instance.
     *
     * @method clone
     * @returns A new BigNumber instance, identical to the original.
     *
     * @example
     * const bn = new BigNumber('123456', 10, 'be');
     * const bnClone = bn.clone();
     */
    clone() {
        const r = new BigNumber();
        this.copy(r);
        return r;
    }
    /**
     * Increases the BigNumber length up to a certain size and initializes new elements with 0.
     *
     * @method expand
     * @param size - The desired size to grow the BigNumber length.
     * @returns The BigNumber instance after expansion.
     *
     * @example
     * const bn = new BigNumber('123456', 10, 'be');
     * bn.expand(10);
     */
    expand(size) {
        while (this.length < size) {
            this.words[this.length++] = 0;
        }
        return this;
    }
    /**
     * Removes leading zeros.
     *
     * @method strip
     * @returns - Returns the BigNumber after stripping leading zeros.
     *
     * @example
     * const bn = new BigNumber("000000", 2, "be");
     * bn.strip();
     * // bn now represents 0
     */
    strip() {
        while (this.length > 1 && this.words[this.length - 1] === 0) {
            this.length--;
        }
        return this.normSign();
    }
    /**
     * Normalizes the sign of the BigNumber. Changes -0 to 0.
     *
     * @method normSign
     * @returns The normalized BigNumber instance.
     *
     * @example
     * const bn = new BigNumber('-0', 10, 'be');
     * bn.normSign();
     */
    normSign() {
        // -0 = 0
        if (this.length === 1 && this.words[0] === 0) {
            this.negative = 0;
        }
        return this;
    }
    /**
     * Utility for inspecting the current BigNumber instance. Accompanied with a prefix '<BN: ' or '<BN-R: '.
     *
     * @method inspect
     * @returns A string representation to inspect the BigNumber instance.
     *
     * @example
     * const bn = new BigNumber('123456', 10, 'be');
     * bn.inspect();
     */
    inspect() {
        return (this.red !== null ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
    }
    /**
     * Converts the BigNumber instance to a string representation.
     *
     * @method toString
     * @param base - The base for representing number. Default is 10. Other accepted values are 16 and 'hex'.
     * @param padding - Represents the minimum number of digits to represent the BigNumber as a string. Default is 1.
     * @throws If base is not between 2 and 36.
     * @returns The string representation of the BigNumber instance
     *
     * @example
     * const bn = new BigNumber('123456', 10, 'be');
     * bn.toString(16); // Converts the BigNumber to a hexadecimal string.
     */
    toString(base = 10, padding = 1) {
        let out;
        if (base === 16 || base === 'hex') {
            out = '';
            let off = 0;
            let carry = 0;
            for (let i = 0; i < this.length; i++) {
                const w = this.words[i];
                const word = (((w << off) | carry) & 0xffffff).toString(16);
                carry = (w >>> (24 - off)) & 0xffffff;
                off += 2;
                if (off >= 26) {
                    off -= 26;
                    i--;
                }
                if (carry !== 0 || i !== this.length - 1) {
                    out = BigNumber.zeros[6 - word.length] + word + out;
                }
                else {
                    out = word + out;
                }
            }
            if (carry !== 0) {
                out = carry.toString(16) + out;
            }
            if (padding === 0 && out === '0') {
                return '';
            }
            while (out.length % padding !== 0 && padding !== 0) {
                out = '0' + out;
            }
            if (this.negative !== 0) {
                out = '-' + out;
            }
            return out;
        }
        if (base === (base | 0) && base >= 2 && base <= 36) {
            const groupSize = BigNumber.groupSizes[base];
            const groupBase = BigNumber.groupBases[base];
            out = '';
            let c = this.clone();
            c.negative = 0;
            while (!c.isZero()) {
                const r = c.modrn(groupBase).toString(base);
                c = c.idivn(groupBase);
                if (!c.isZero()) {
                    out = BigNumber.zeros[groupSize - r.length] + r + out;
                }
                else {
                    out = r + out;
                }
            }
            if (this.isZero()) {
                out = '0' + out;
            }
            while (out.length % padding !== 0) {
                out = '0' + out;
            }
            if (this.negative !== 0) {
                out = '-' + out;
            }
            return out;
        }
        throw new Error('Base should be between 2 and 36');
    }
    /**
     * Converts the BigNumber instance to a JavaScript number.
     * Please note that JavaScript numbers are only precise up to 53 bits.
     *
     * @method toNumber
     * @throws If the BigNumber instance cannot be safely stored in a JavaScript number
     * @returns The JavaScript number representation of the BigNumber instance.
     *
     * @example
     * const bn = new BigNumber('123456', 10, 'be');
     * bn.toNumber();
     */
    toNumber() {
        let ret = this.words[0];
        if (this.length === 2) {
            ret += this.words[1] * 0x4000000;
        }
        else if (this.length === 3 && this.words[2] === 0x01) {
            // NOTE: at this stage it is known that the top bit is set
            ret += 0x10000000000000 + (this.words[1] * 0x4000000);
        }
        else if (this.length > 2) {
            throw new Error('Number can only safely store up to 53 bits');
        }
        return (this.negative !== 0) ? -ret : ret;
    }
    /**
     * Converts the BigNumber instance to a JSON-formatted string.
     *
     * @method toJSON
     * @returns The JSON string representation of the BigNumber instance.
     *
     * @example
     * const bn = new BigNumber('123456', 10, 'be');
     * bn.toJSON();
     */
    toJSON() {
        return this.toString(16);
    }
    /**
     * An internal method to format the BigNumber instance into ArrayTypes of Little Endian Type.
     * This is a private method.
     *
     * @method toArrayLikeLE
     * @private
     * @param res - The resultant ArrayType instance
     * @param byteLength - The byte length to define the size of ArrayType
     */
    toArrayLikeLE(res, byteLength) {
        let position = 0;
        let carry = 0;
        for (let i = 0, shift = 0; i < this.length; i++) {
            const word = (this.words[i] << shift) | carry;
            res[position++] = word & 0xff;
            if (position < res.length) {
                res[position++] = (word >> 8) & 0xff;
            }
            if (position < res.length) {
                res[position++] = (word >> 16) & 0xff;
            }
            if (shift === 6) {
                if (position < res.length) {
                    res[position++] = (word >> 24) & 0xff;
                }
                carry = 0;
                shift = 0;
            }
            else {
                carry = word >>> 24;
                shift += 2;
            }
        }
        if (position < res.length) {
            res[position++] = carry;
            while (position < res.length) {
                res[position++] = 0;
            }
        }
    }
    /**
     * An internal method to format the BigNumber instance into ArrayTypes of Big Endian Type.
     * This is a private method.
     *
     * @method toArrayLikeBE
     * @private
     * @param res - The resultant ArrayType instance
     * @param byteLength - The byte length to define the size of ArrayType
     */
    toArrayLikeBE(res, byteLength) {
        let position = res.length - 1;
        let carry = 0;
        for (let i = 0, shift = 0; i < this.length; i++) {
            const word = (this.words[i] << shift) | carry;
            res[position--] = word & 0xff;
            if (position >= 0) {
                res[position--] = (word >> 8) & 0xff;
            }
            if (position >= 0) {
                res[position--] = (word >> 16) & 0xff;
            }
            if (shift === 6) {
                if (position >= 0) {
                    res[position--] = (word >> 24) & 0xff;
                }
                carry = 0;
                shift = 0;
            }
            else {
                carry = word >>> 24;
                shift += 2;
            }
        }
        if (position >= 0) {
            res[position--] = carry;
            while (position >= 0) {
                res[position--] = 0;
            }
        }
    }
    /**
     * Converts the BigNumber instance to a JavaScript number array.
     *
     * @method toArray
     * @param endian - The endian for converting BigNumber to array. Default value is 'be'.
     * @param length - The length for the resultant array. Default value is undefined.
     * @returns The JavaScript array representation of the BigNumber instance.
     *
     * @example
     * const bn = new BigNumber('123456', 10, 'be');
     * bn.toArray('be', 8);
     */
    toArray(endian = 'be', length) {
        this.strip();
        const byteLength = this.byteLength();
        const reqLength = length ?? Math.max(1, byteLength);
        this.assert(byteLength <= reqLength, 'byte array longer than desired length');
        this.assert(reqLength > 0, 'Requested array length <= 0');
        const res = new Array(reqLength);
        if (endian === 'le') {
            this.toArrayLikeLE(res, byteLength);
        }
        else {
            this.toArrayLikeBE(res, byteLength);
        }
        return res;
    }
    /**
     * A utility method to count the word bits.
     * This is a private method.
     *
     * @method countWordBits
     * @private
     * @param w - The input number to count the word bits.
     * @returns The number of word bits
     */
    countWordBits(w) {
        if (typeof Math.clz32 === 'function') {
            return 32 - Math.clz32(w);
        }
        let t = w;
        let r = 0;
        if (t >= 0x1000) {
            r += 13;
            t >>>= 13;
        }
        if (t >= 0x40) {
            r += 7;
            t >>>= 7;
        }
        if (t >= 0x8) {
            r += 4;
            t >>>= 4;
        }
        if (t >= 0x02) {
            r += 2;
            t >>>= 2;
        }
        return r + t;
    }
    /**
     * A utility method to compute the number of zero bits.
     * This is a private method.
     *
     * @method zeroWordBits
     * @private
     * @param w - The input number to count the zero bits.
     * @returns The number of zero bits
     */
    zeroWordBits(w) {
        // Short-cut
        if (w === 0)
            return 26;
        let t = w;
        let r = 0;
        if ((t & 0x1fff) === 0) {
            r += 13;
            t >>>= 13;
        }
        if ((t & 0x7f) === 0) {
            r += 7;
            t >>>= 7;
        }
        if ((t & 0xf) === 0) {
            r += 4;
            t >>>= 4;
        }
        if ((t & 0x3) === 0) {
            r += 2;
            t >>>= 2;
        }
        if ((t & 0x1) === 0) {
            r++;
        }
        return r;
    }
    /**
     * Returns the number of used bits in this big number.
     *
     * @method bitLength
     * @returns The number of used bits
     */
    bitLength() {
        const w = this.words[this.length - 1];
        const hi = this.countWordBits(w);
        return (this.length - 1) * 26 + hi;
    }
    /**
     * Convert a big number to a boolean array representing
     * a binary number, where each array index is a bit.
     * @static
     * @method toBitArray
     * @param num - The big number to convert.
     * @returns Returns an array of booleans representing
     * a binary number, with each array index being a bit.
     * @example
     * const BigNumber = require("./BigNumber");
     * const bn = new BigNumber('6'); // binary: 110
     * const bits = BigNumber.toBitArray(bn); // [1,1,0]
     */
    static toBitArray(num) {
        const w = new Array(num.bitLength());
        for (let bit = 0; bit < w.length; bit++) {
            const off = (bit / 26) | 0;
            const wbit = bit % 26;
            w[bit] = (num.words[off] >>> wbit) & 0x01;
        }
        return w;
    }
    /**
     * Convert this big number to a boolean array representing
     * a binary number, where each array index is a bit.
     * @method toBitArray
     * @returns Returns an array of booleans representing a binary number.
     *
     * @example
     * const BigNumber = require("./BigNumber");
     * const bn = new BigNumber('6'); // binary: 110
     * const bits = bn.toBitArray(); // [ 1, 1, 0 ]
     */
    toBitArray() {
        return BigNumber.toBitArray(this);
    }
    /**
     * Returns the number of trailing zero bits in the big number.
     * @method zeroBits
     * @returns Returns the number of trailing zero bits
     * in the binary representation of the big number.
     * @example
     * const BigNumber = require("./BigNumber");
     * const bn = new BigNumber('8'); // binary: 1000
     * const zeroBits = bn.zeroBits(); // 3
     */
    zeroBits() {
        if (this.isZero())
            return 0;
        let r = 0;
        for (let i = 0; i < this.length; i++) {
            const b = this.zeroWordBits(this.words[i]);
            r += b;
            if (b !== 26)
                break;
        }
        return r;
    }
    /**
     * Get the byte length of the BigNumber
     *
     * @method byteLength
     * @returns Returns the byte length of the big number.
     * @example
     * const BigNumber = require("./BigNumber");
     * const bn = new BigNumber('1234');
     * const byteLen = bn.byteLength();
     */
    byteLength() {
        return Math.ceil(this.bitLength() / 8);
    }
    /**
     * Converts this big number to two's complement with a specified bit width.
     * @method toTwos
     * @param width - The bit width.
     * @returns Returns the two's complement of the big number.
     *
     * @example
     * const BigNumber = require("./BigNumber");
     * const bn = new BigNumber('-1234');
     * const twosComp = bn.toTwos(16);
     */
    toTwos(width) {
        if (this.negative !== 0) {
            return this.abs().inotn(width).iaddn(1);
        }
        return this.clone();
    }
    /**
     * Converts this big number from two's complement with a specified bit width.
     * @method fromTwos
     * @param width - The bit width.
     * @returns Returns the big number converted from two's complement.
     *
     * @example
     * const BigNumber = require("./BigNumber");
     * const bn = new BigNumber('-1234');
     * const fromTwos = bn.fromTwos(16);
     */
    fromTwos(width) {
        if (this.testn(width - 1)) {
            return this.notn(width).iaddn(1).ineg();
        }
        return this.clone();
    }
    /**
     * Checks if the big number is negative.
     * @method isNeg
     * @returns Returns true if the big number is negative, otherwise false.
     *
     * @example
     * const BigNumber = require("./BigNumber");
     * const bn = new BigNumber('-1234');
     * const isNegative = bn.isNeg(); // true
     */
    isNeg() {
        return this.negative !== 0;
    }
    /**
     * Negates the big number and returns a new instance.
     * @method neg
     * @returns Returns a new BigNumber that is the negation of this big number.
     *
     * @example
     * const BigNumber = require("./BigNumber");
     * const bn = new BigNumber('1234');
     * const neg = bn.neg(); // -1234
     */
    neg() {
        return this.clone().ineg();
    }
    /**
     * Negates the big number in-place.
     * @method ineg
     * @returns Returns this big number as the negation of itself.
     *
     * @example
     * const BigNumber = require("./BigNumber");
     * const bn = new BigNumber('1234');
     * bn.ineg(); // bn is now -1234
     */
    ineg() {
        if (!this.isZero()) {
            this.negative ^= 1;
        }
        return this;
    }
    /**
     * Performs a bitwise OR operation with another BigNumber and stores
     * the result in this BigNumber.
     * @method iuor
     * @param num - The other BigNumber.
     * @returns Returns this BigNumber after performing the bitwise OR operation.
     *
     * @example
     * const BigNumber = require("./BigNumber");
     * const bn1 = new BigNumber('10'); // binary: 1010
     * const bn2 = new(num: BigNumber): BigNumber BigNumber('6'); // binary: 0110
     * bn1.iuor(bn2); // now, bn1 binary: 1110
     */
    iuor(num) {
        while (this.length < num.length) {
            this.words[this.length++] = 0;
        }
        for (let i = 0; i < num.length; i++) {
            this.words[i] = this.words[i] | num.words[i];
        }
        return this.strip();
    }
    /**
     * Performs a bitwise OR operation with another BigNumber, considering
     * that neither of the numbers can be negative. Stores the result in this BigNumber.
     * @method ior
     * @param num - The other BigNumber.
     * @returns Returns this BigNumber after performing the bitwise OR operation.
     *
     * @example
     * const BigNumber = require("./BigNumber");
     * const bn1 = new BigNumber('10'); // binary: 1010
     * const bn2 = new BigNumber('6'); // binary: 0110
     * bn1.ior(bn2); // now, bn1 binary: 1110
     */
    ior(num) {
        this.assert((this.negative | num.negative) === 0);
        return this.iuor(num);
    }
    /**
     * Performs a bitwise OR operation on the current instance and given
     * BigNumber and returns a new BigNumber, in such a way that if either
     * the corresponding bit in the first operand or the second operand is
     * 1, then the output is also 1.
     *
     * @method or
     * @param num - The BigNumber to perform the bitwise OR operation with.
     * @returns Returns a new BigNumber resulting from the bitwise OR operation.
     *
     * @example
     * const num1 = new BigNumber('10');
     * const num2 = new BigNumber('20');
     * console.log(num1.or(num2).toString());
     */
    or(num) {
        if (this.length > num.length)
            return this.clone().ior(num);
        return num.clone().ior(this);
    }
    /**
     * Performs a bitwise OR operation on the current instance and given
     * BigNumber without considering signed bit(no negative values) and returns a new BigNumber,
     * similar to the `or` method.
     *
     * @method uor
     * @param num - The BigNumber to perform the bitwise OR operation with.
     * @returns Returns a new BigNumber resulting from the bitwise OR operation without sign consideration.
     *
     * @example
     * const num1 = new BigNumber('10');
     * const num2 = new BigNumber('20');
     * console.log(num1.uor(num2).toString());
     */
    uor(num) {
        if (this.length > num.length)
            return this.clone().iuor(num);
        return num.clone().iuor(this);
    }
    /**
     * Performs a bitwise AND operation in-place(this method changes the calling object)
     * on the current instance and given BigNumber such that it modifies the current
     * instance and keeps the bits set in the result only if the corresponding bit is set
     * in both operands.
     *
     * @method iuand
     * @param num - The BigNumber to perform the bitwise AND operation with.
     * @returns Returns the current BigNumber instance after performing the bitwise AND operation.
     *
     * @example
     * const num1 = new BigNumber('10');
     * const num2 = new BigNumber('20');
     * console.log(num1.iuand(num2).toString());
     */
    iuand(num) {
        const minLength = Math.min(this.length, num.length);
        for (let i = 0; i < minLength; i++) {
            this.words[i] = this.words[i] & num.words[i];
        }
        this.length = minLength;
        return this.strip();
    }
    /**
     * Performs an in-place operation that does a bitwise AND operation in-place,
     * on the current instance and given BigNumber such that it modifies the current
     * instance only if neither operand is negative. This method is similar to the iuand method but
     * checks for negative values before operation.
     *
     * @method iand
     * @param num - The BigNumber to perform the bitwise AND operation with.
     * @returns Returns the current BigNumber instance after performing the bitwise AND operation.
     *
     * @example
     * const num1 = new BigNumber('10');
     * const num2 = new BigNumber('20');
     * console.log(num1.iand(num2).toString());
     */
    iand(num) {
        this.assert((this.negative | num.negative) === 0);
        return this.iuand(num);
    }
    /**
     * Performs a bitwise AND operation that returns a new BigNumber, and keeps the bits
     * set in the result only if the corresponding bit is set in both operands.
     *
     * @method and
     * @param num - The BigNumber to perform the bitwise AND operation with.
     * @returns Returns new BigNumber resulting from the bitwise AND operation.
     *
     * @example
     * const num1 = new BigNumber('10');
     * const num2 = new BigNumber('20');
     * console.log(num1.and(num2).toString());
     */
    and(num) {
        if (this.length > num.length)
            return this.clone().iand(num);
        return num.clone().iand(this);
    }
    /**
     * Performs a bitwise AND operation without considering signed bit
     * (no negative values) which returns a new BigNumber, similar to the `and` method.
     *
     * @method uand
     * @param num - The BigNumber to perform the bitwise AND operation with.
     * @returns Returns new BigNumber resulting from the bitwise AND operation without sign consideration.
     *
     * @example
     * const num1 = new BigNumber('10');
     * const num2 = new BigNumber('20');
     * console.log(num1.uand(num2).toString());
     */
    uand(num) {
        if (this.length > num.length)
            return this.clone().iuand(num);
        return num.clone().iuand(this);
    }
    /**
     * Modifies the current instance by performing a bitwise XOR operation
     * in-place with the provided BigNumber. It keeps the bits set in the result only if the
     * corresponding bits in the operands are different.
     *
     * @method iuxor
     * @param num - The BigNumber to perform the bitwise XOR operation with.
     * @returns Returns the current BigNumber instance after performing the bitwise XOR operation.
     *
     * @example
     * const num1 = new BigNumber('10');
     * const num2 = new BigNumber('20');
     * console.log(num1.iuxor(num2).toString());
     */
    iuxor(num) {
        if (this.length > num.length) {
            for (let i = 0; i < num.length; i++) {
                this.words[i] = this.words[i] ^ num.words[i];
            }
        }
        else {
            for (let i = 0; i < this.length; i++) {
                this.words[i] = this.words[i] ^ num.words[i];
            }
            for (let i = this.length; i < num.length; i++) {
                this.words[i] = num.words[i];
            }
            this.length = num.length;
        }
        return this.strip();
    }
    /**
     * Performs an in-place operation that does a bitwise XOR operation in-place,
     * on the current instance and given BigNumber such that it modifies the current
     * instance only if neither operand is negative. This method is similar to the iuxor method but
     * checks for negative values before operation.
     *
     * @method ixor
     * @param num - The BigNumber to perform the bitwise XOR operation with.
     * @returns Returns the current BigNumber instance after performing the bitwise XOR operation.
     *
     * @example
     * const num1 = new BigNumber('10');
     * const num2 = new BigNumber('20');
     * console.log(num1.ixor(num2).toString());
     */
    ixor(num) {
        this.assert((this.negative | num.negative) === 0, 'Neither number can be negative');
        return this.iuxor(num);
    }
    /**
     * Performs a bitwise XOR operation which returns a new BigNumber, and keeps the bits
     * set in the result only if the corresponding bits in the operands are different.
     *
     * @method xor
     * @param num - The BigNumber to perform the bitwise XOR operation with.
     * @returns Returns a new BigNumber resulting from the bitwise XOR operation.
     *
     * @example
     * const num1 = new BigNumber('10');
     * const num2 = new BigNumber('20');
     * console.log(num1.xor(num2).toString());
     */
    xor(num) {
        if (this.length > num.length)
            return this.clone().ixor(num);
        return num.clone().ixor(this);
    }
    /**
     * Performs an unsigned XOR operation on this BigNumber with the supplied BigNumber. Returns a new BigNumber.
     *
     * @method uxor
     * @param num - The BigNumber with which the unsigned bitwise XOR operation is to be performed.
     * @returns Returns a new BigNumber resulting from the unsigned bitwise XOR operation.
     *
     * @example
     * const num1 = new BigNumber('30');
     * const num2 = new BigNumber('40');
     * console.log(num1.uxor(num2).toString()); // Output will be the result of unsigned XOR operation
     */
    uxor(num) {
        if (this.length > num.length)
            return this.clone().iuxor(num);
        return num.clone().iuxor(this);
    }
    /**
     * In-place method that performs a bitwise NOT operation on a BigNumber up to a specified bit width.
     *
     * @method inotn
     * @param width - The number of bits to perform the NOT operation on.
     * @returns Returns the BigNumber after performing the bitwise NOT operation.
     *
     * @example
     * const num = new BigNumber('42');
     * num.inotn(10);
     * console.log(num.toString());
     */
    inotn(width) {
        this.assert(typeof width === 'number' && width >= 0, 'The width needs to be a number greater than zero');
        let bytesNeeded = Math.ceil(width / 26) | 0;
        const bitsLeft = width % 26;
        // Extend the number with leading zeroes
        this.expand(bytesNeeded);
        if (bitsLeft > 0) {
            bytesNeeded--;
        }
        // Handle complete words
        let i = 0;
        for (; i < bytesNeeded; i++) {
            this.words[i] = ~this.words[i] & 0x3ffffff;
        }
        // Handle the residue
        if (bitsLeft > 0) {
            this.words[i] = ~this.words[i] & (0x3ffffff >> (26 - bitsLeft));
        }
        // And remove leading zeroes
        return this.strip();
    }
    /**
     * Performs a bitwise NOT operation on a BigNumber up to a specified bit width. Returns a new BigNumber.
     *
     * @method notn
     * @param width - The number of bits to perform the NOT operation on.
     * @returns Returns a new BigNumber resulting from the bitwise NOT operation.
     *
     * @example
     * const num = new BigNumber('42');
     * const notnResult = num.notn(10);
     * console.log(notnResult.toString());
     */
    notn(width) {
        return this.clone().inotn(width);
    }
    /**
     * Set `bit` of `this` BigNumber. The `bit` is a position in the binary representation,
     * and `val` is the value to be set at that position (`0` or `1`).
     *
     * @method setn
     * @param bit - The bit position to set.
     * @param val - The value to set at the bit position.
     * @returns Returns the BigNumber after setting the value at the bit position.
     *
     * @example
     * const num = new BigNumber('42');
     * num.setn(2, 1);
     * console.log(num.toString());
     */
    setn(bit, val) {
        this.assert(typeof bit === 'number' && bit >= 0);
        const off = (bit / 26) | 0;
        const wbit = bit % 26;
        this.expand(off + 1);
        if (val === 1 || val === true) {
            this.words[off] = this.words[off] | (1 << wbit);
        }
        else {
            this.words[off] = this.words[off] & ~(1 << wbit);
        }
        return this.strip();
    }
    /**
     * Add `num` to `this` BigNumber in-place.
     *
     * @method iadd
     * @param num - The BigNumber to add to `this` BigNumber.
     * @returns Returns the BigNumber after performing the addition.
     *
     * @example
     * const num1 = new BigNumber('10');
     * num1.iadd(new BigNumber('20'));
     * console.log(num1.toString());
     */
    iadd(num) {
        let r;
        // negative + positive
        if (this.negative !== 0 && num.negative === 0) {
            this.negative = 0;
            r = this.isub(num);
            this.negative ^= 1;
            return this.normSign();
            // positive + negative
        }
        else if (this.negative === 0 && num.negative !== 0) {
            num.negative = 0;
            r = this.isub(num);
            num.negative = 1;
            return r.normSign();
        }
        // a.length > b.length
        let a, b;
        if (this.length > num.length) {
            /* eslint-disable @typescript-eslint/no-this-alias */
            a = this;
            b = num;
        }
        else {
            a = num;
            /* eslint-disable @typescript-eslint/no-this-alias */
            b = this;
        }
        let carry = 0;
        let i = 0;
        for (; i < b.length; i++) {
            r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
            this.words[i] = r & 0x3ffffff;
            carry = r >>> 26;
        }
        for (; carry !== 0 && i < a.length; i++) {
            r = (a.words[i] | 0) + carry;
            this.words[i] = r & 0x3ffffff;
            carry = r >>> 26;
        }
        this.length = a.length;
        if (carry !== 0) {
            this.words[this.length] = carry;
            this.length++;
            // Copy the rest of the words
        }
        else if (a !== this) {
            for (; i < a.length; i++) {
                this.words[i] = a.words[i];
            }
        }
        return this;
    }
    /**
     * Add `num` to `this` BigNumber.
     *
     * @method add
     * @param num - The BigNumber to add to `this` BigNumber.
     * @returns Returns a new BigNumber which is the result of the addition.
     *
     * @example
     * const num1 = new BigNumber('10');
     * const addResult = num1.add(new BigNumber('20'));
     * console.log(addResult.toString());
     */
    add(num) {
        let res;
        if (num.negative !== 0 && this.negative === 0) {
            num.negative = 0;
            res = this.sub(num);
            num.negative ^= 1;
            return res;
        }
        else if (num.negative === 0 && this.negative !== 0) {
            this.negative = 0;
            res = num.sub(this);
            this.negative = 1;
            return res;
        }
        if (this.length > num.length)
            return this.clone().iadd(num);
        return num.clone().iadd(this);
    }
    /**
     * Subtract `num` from `this` BigNumber in-place.
     *
     * @method isub
     * @param num - The BigNumber to be subtracted from `this` BigNumber.
     * @returns Returns the BigNumber after performing the subtraction.
     *
     * @example
     * const num1 = new BigNumber('20');
     * num1.isub(new BigNumber('10'));
     * console.log(num1.toString());
     */
    isub(num) {
        let r;
        // this - (-num) = this + num
        if (num.negative !== 0) {
            num.negative = 0;
            r = this.iadd(num);
            num.negative = 1;
            return r.normSign();
            // -this - num = -(this + num)
        }
        else if (this.negative !== 0) {
            this.negative = 0;
            this.iadd(num);
            this.negative = 1;
            return this.normSign();
        }
        // At this point both numbers are positive
        const cmp = this.cmp(num);
        // Optimization - zeroify
        if (cmp === 0) {
            this.negative = 0;
            this.length = 1;
            this.words[0] = 0;
            return this;
        }
        // a > b
        let a, b;
        if (cmp > 0) {
            /* eslint-disable @typescript-eslint/no-this-alias */
            a = this;
            b = num;
        }
        else {
            a = num;
            /* eslint-disable @typescript-eslint/no-this-alias */
            b = this;
        }
        let carry = 0;
        let i = 0;
        for (; i < b.length; i++) {
            r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
            carry = r >> 26;
            this.words[i] = r & 0x3ffffff;
        }
        for (; carry !== 0 && i < a.length; i++) {
            r = (a.words[i] | 0) + carry;
            carry = r >> 26;
            this.words[i] = r & 0x3ffffff;
        }
        // Copy rest of the words
        if (carry === 0 && i < a.length && a !== this) {
            for (; i < a.length; i++) {
                this.words[i] = a.words[i];
            }
        }
        this.length = Math.max(this.length, i);
        if (a !== this) {
            this.negative = 1;
        }
        return this.strip();
    }
    /**
     * Subtract `num` from `this` BigNumber.
     *
     * @method sub
     * @param num - The BigNumber to be subtracted from `this` BigNumber.
     * @returns Returns a new BigNumber which is the result of the subtraction.
     *
     * @example
     * const num1 = new BigNumber('20');
     * const subResult = num1.sub(new BigNumber('10'));
     * console.log(subResult.toString());
     */
    sub(num) {
        return this.clone().isub(num);
    }
    smallMulTo(self, num, out) {
        out.negative = num.negative ^ self.negative;
        let len = (self.length + num.length) | 0;
        out.length = len;
        len = (len - 1) | 0;
        // Peel one iteration (compiler can't do it, because of code complexity)
        let a = self.words[0] | 0;
        let b = num.words[0] | 0;
        let r = a * b;
        const lo = r & 0x3ffffff;
        let carry = (r / 0x4000000) | 0;
        out.words[0] = lo;
        let k = 1;
        for (; k < len; k++) {
            // Sum all words with the same `i + j = k` and accumulate `ncarry`,
            // note that ncarry could be >= 0x3ffffff
            let ncarry = carry >>> 26;
            let rword = carry & 0x3ffffff;
            const maxJ = Math.min(k, num.length - 1);
            for (let j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
                const i = (k - j) | 0;
                a = self.words[i] | 0;
                b = num.words[j] | 0;
                r = a * b + rword;
                ncarry += (r / 0x4000000) | 0;
                rword = r & 0x3ffffff;
            }
            out.words[k] = rword | 0;
            carry = ncarry | 0;
        }
        if (carry !== 0) {
            out.words[k] = carry | 0;
        }
        else {
            out.length--;
        }
        return out.strip();
    }
    comb10MulTo(self, num, out) {
        const a = self.words;
        const b = num.words;
        const o = out.words;
        let c = 0;
        let lo;
        let mid;
        let hi;
        const a0 = a[0] | 0;
        const al0 = a0 & 0x1fff;
        const ah0 = a0 >>> 13;
        const a1 = a[1] | 0;
        const al1 = a1 & 0x1fff;
        const ah1 = a1 >>> 13;
        const a2 = a[2] | 0;
        const al2 = a2 & 0x1fff;
        const ah2 = a2 >>> 13;
        const a3 = a[3] | 0;
        const al3 = a3 & 0x1fff;
        const ah3 = a3 >>> 13;
        const a4 = a[4] | 0;
        const al4 = a4 & 0x1fff;
        const ah4 = a4 >>> 13;
        const a5 = a[5] | 0;
        const al5 = a5 & 0x1fff;
        const ah5 = a5 >>> 13;
        const a6 = a[6] | 0;
        const al6 = a6 & 0x1fff;
        const ah6 = a6 >>> 13;
        const a7 = a[7] | 0;
        const al7 = a7 & 0x1fff;
        const ah7 = a7 >>> 13;
        const a8 = a[8] | 0;
        const al8 = a8 & 0x1fff;
        const ah8 = a8 >>> 13;
        const a9 = a[9] | 0;
        const al9 = a9 & 0x1fff;
        const ah9 = a9 >>> 13;
        const b0 = b[0] | 0;
        const bl0 = b0 & 0x1fff;
        const bh0 = b0 >>> 13;
        const b1 = b[1] | 0;
        const bl1 = b1 & 0x1fff;
        const bh1 = b1 >>> 13;
        const b2 = b[2] | 0;
        const bl2 = b2 & 0x1fff;
        const bh2 = b2 >>> 13;
        const b3 = b[3] | 0;
        const bl3 = b3 & 0x1fff;
        const bh3 = b3 >>> 13;
        const b4 = b[4] | 0;
        const bl4 = b4 & 0x1fff;
        const bh4 = b4 >>> 13;
        const b5 = b[5] | 0;
        const bl5 = b5 & 0x1fff;
        const bh5 = b5 >>> 13;
        const b6 = b[6] | 0;
        const bl6 = b6 & 0x1fff;
        const bh6 = b6 >>> 13;
        const b7 = b[7] | 0;
        const bl7 = b7 & 0x1fff;
        const bh7 = b7 >>> 13;
        const b8 = b[8] | 0;
        const bl8 = b8 & 0x1fff;
        const bh8 = b8 >>> 13;
        const b9 = b[9] | 0;
        const bl9 = b9 & 0x1fff;
        const bh9 = b9 >>> 13;
        out.negative = self.negative ^ num.negative;
        out.length = 19;
        /* k = 0 */
        lo = Math.imul(al0, bl0);
        mid = Math.imul(al0, bh0);
        mid = (mid + Math.imul(ah0, bl0)) | 0;
        hi = Math.imul(ah0, bh0);
        let w0 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w0 >>> 26)) | 0;
        w0 &= 0x3ffffff;
        /* k = 1 */
        lo = Math.imul(al1, bl0);
        mid = Math.imul(al1, bh0);
        mid = (mid + Math.imul(ah1, bl0)) | 0;
        hi = Math.imul(ah1, bh0);
        lo = (lo + Math.imul(al0, bl1)) | 0;
        mid = (mid + Math.imul(al0, bh1)) | 0;
        mid = (mid + Math.imul(ah0, bl1)) | 0;
        hi = (hi + Math.imul(ah0, bh1)) | 0;
        let w1 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w1 >>> 26)) | 0;
        w1 &= 0x3ffffff;
        /* k = 2 */
        lo = Math.imul(al2, bl0);
        mid = Math.imul(al2, bh0);
        mid = (mid + Math.imul(ah2, bl0)) | 0;
        hi = Math.imul(ah2, bh0);
        lo = (lo + Math.imul(al1, bl1)) | 0;
        mid = (mid + Math.imul(al1, bh1)) | 0;
        mid = (mid + Math.imul(ah1, bl1)) | 0;
        hi = (hi + Math.imul(ah1, bh1)) | 0;
        lo = (lo + Math.imul(al0, bl2)) | 0;
        mid = (mid + Math.imul(al0, bh2)) | 0;
        mid = (mid + Math.imul(ah0, bl2)) | 0;
        hi = (hi + Math.imul(ah0, bh2)) | 0;
        let w2 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w2 >>> 26)) | 0;
        w2 &= 0x3ffffff;
        /* k = 3 */
        lo = Math.imul(al3, bl0);
        mid = Math.imul(al3, bh0);
        mid = (mid + Math.imul(ah3, bl0)) | 0;
        hi = Math.imul(ah3, bh0);
        lo = (lo + Math.imul(al2, bl1)) | 0;
        mid = (mid + Math.imul(al2, bh1)) | 0;
        mid = (mid + Math.imul(ah2, bl1)) | 0;
        hi = (hi + Math.imul(ah2, bh1)) | 0;
        lo = (lo + Math.imul(al1, bl2)) | 0;
        mid = (mid + Math.imul(al1, bh2)) | 0;
        mid = (mid + Math.imul(ah1, bl2)) | 0;
        hi = (hi + Math.imul(ah1, bh2)) | 0;
        lo = (lo + Math.imul(al0, bl3)) | 0;
        mid = (mid + Math.imul(al0, bh3)) | 0;
        mid = (mid + Math.imul(ah0, bl3)) | 0;
        hi = (hi + Math.imul(ah0, bh3)) | 0;
        let w3 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w3 >>> 26)) | 0;
        w3 &= 0x3ffffff;
        /* k = 4 */
        lo = Math.imul(al4, bl0);
        mid = Math.imul(al4, bh0);
        mid = (mid + Math.imul(ah4, bl0)) | 0;
        hi = Math.imul(ah4, bh0);
        lo = (lo + Math.imul(al3, bl1)) | 0;
        mid = (mid + Math.imul(al3, bh1)) | 0;
        mid = (mid + Math.imul(ah3, bl1)) | 0;
        hi = (hi + Math.imul(ah3, bh1)) | 0;
        lo = (lo + Math.imul(al2, bl2)) | 0;
        mid = (mid + Math.imul(al2, bh2)) | 0;
        mid = (mid + Math.imul(ah2, bl2)) | 0;
        hi = (hi + Math.imul(ah2, bh2)) | 0;
        lo = (lo + Math.imul(al1, bl3)) | 0;
        mid = (mid + Math.imul(al1, bh3)) | 0;
        mid = (mid + Math.imul(ah1, bl3)) | 0;
        hi = (hi + Math.imul(ah1, bh3)) | 0;
        lo = (lo + Math.imul(al0, bl4)) | 0;
        mid = (mid + Math.imul(al0, bh4)) | 0;
        mid = (mid + Math.imul(ah0, bl4)) | 0;
        hi = (hi + Math.imul(ah0, bh4)) | 0;
        let w4 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w4 >>> 26)) | 0;
        w4 &= 0x3ffffff;
        /* k = 5 */
        lo = Math.imul(al5, bl0);
        mid = Math.imul(al5, bh0);
        mid = (mid + Math.imul(ah5, bl0)) | 0;
        hi = Math.imul(ah5, bh0);
        lo = (lo + Math.imul(al4, bl1)) | 0;
        mid = (mid + Math.imul(al4, bh1)) | 0;
        mid = (mid + Math.imul(ah4, bl1)) | 0;
        hi = (hi + Math.imul(ah4, bh1)) | 0;
        lo = (lo + Math.imul(al3, bl2)) | 0;
        mid = (mid + Math.imul(al3, bh2)) | 0;
        mid = (mid + Math.imul(ah3, bl2)) | 0;
        hi = (hi + Math.imul(ah3, bh2)) | 0;
        lo = (lo + Math.imul(al2, bl3)) | 0;
        mid = (mid + Math.imul(al2, bh3)) | 0;
        mid = (mid + Math.imul(ah2, bl3)) | 0;
        hi = (hi + Math.imul(ah2, bh3)) | 0;
        lo = (lo + Math.imul(al1, bl4)) | 0;
        mid = (mid + Math.imul(al1, bh4)) | 0;
        mid = (mid + Math.imul(ah1, bl4)) | 0;
        hi = (hi + Math.imul(ah1, bh4)) | 0;
        lo = (lo + Math.imul(al0, bl5)) | 0;
        mid = (mid + Math.imul(al0, bh5)) | 0;
        mid = (mid + Math.imul(ah0, bl5)) | 0;
        hi = (hi + Math.imul(ah0, bh5)) | 0;
        let w5 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w5 >>> 26)) | 0;
        w5 &= 0x3ffffff;
        /* k = 6 */
        lo = Math.imul(al6, bl0);
        mid = Math.imul(al6, bh0);
        mid = (mid + Math.imul(ah6, bl0)) | 0;
        hi = Math.imul(ah6, bh0);
        lo = (lo + Math.imul(al5, bl1)) | 0;
        mid = (mid + Math.imul(al5, bh1)) | 0;
        mid = (mid + Math.imul(ah5, bl1)) | 0;
        hi = (hi + Math.imul(ah5, bh1)) | 0;
        lo = (lo + Math.imul(al4, bl2)) | 0;
        mid = (mid + Math.imul(al4, bh2)) | 0;
        mid = (mid + Math.imul(ah4, bl2)) | 0;
        hi = (hi + Math.imul(ah4, bh2)) | 0;
        lo = (lo + Math.imul(al3, bl3)) | 0;
        mid = (mid + Math.imul(al3, bh3)) | 0;
        mid = (mid + Math.imul(ah3, bl3)) | 0;
        hi = (hi + Math.imul(ah3, bh3)) | 0;
        lo = (lo + Math.imul(al2, bl4)) | 0;
        mid = (mid + Math.imul(al2, bh4)) | 0;
        mid = (mid + Math.imul(ah2, bl4)) | 0;
        hi = (hi + Math.imul(ah2, bh4)) | 0;
        lo = (lo + Math.imul(al1, bl5)) | 0;
        mid = (mid + Math.imul(al1, bh5)) | 0;
        mid = (mid + Math.imul(ah1, bl5)) | 0;
        hi = (hi + Math.imul(ah1, bh5)) | 0;
        lo = (lo + Math.imul(al0, bl6)) | 0;
        mid = (mid + Math.imul(al0, bh6)) | 0;
        mid = (mid + Math.imul(ah0, bl6)) | 0;
        hi = (hi + Math.imul(ah0, bh6)) | 0;
        let w6 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w6 >>> 26)) | 0;
        w6 &= 0x3ffffff;
        /* k = 7 */
        lo = Math.imul(al7, bl0);
        mid = Math.imul(al7, bh0);
        mid = (mid + Math.imul(ah7, bl0)) | 0;
        hi = Math.imul(ah7, bh0);
        lo = (lo + Math.imul(al6, bl1)) | 0;
        mid = (mid + Math.imul(al6, bh1)) | 0;
        mid = (mid + Math.imul(ah6, bl1)) | 0;
        hi = (hi + Math.imul(ah6, bh1)) | 0;
        lo = (lo + Math.imul(al5, bl2)) | 0;
        mid = (mid + Math.imul(al5, bh2)) | 0;
        mid = (mid + Math.imul(ah5, bl2)) | 0;
        hi = (hi + Math.imul(ah5, bh2)) | 0;
        lo = (lo + Math.imul(al4, bl3)) | 0;
        mid = (mid + Math.imul(al4, bh3)) | 0;
        mid = (mid + Math.imul(ah4, bl3)) | 0;
        hi = (hi + Math.imul(ah4, bh3)) | 0;
        lo = (lo + Math.imul(al3, bl4)) | 0;
        mid = (mid + Math.imul(al3, bh4)) | 0;
        mid = (mid + Math.imul(ah3, bl4)) | 0;
        hi = (hi + Math.imul(ah3, bh4)) | 0;
        lo = (lo + Math.imul(al2, bl5)) | 0;
        mid = (mid + Math.imul(al2, bh5)) | 0;
        mid = (mid + Math.imul(ah2, bl5)) | 0;
        hi = (hi + Math.imul(ah2, bh5)) | 0;
        lo = (lo + Math.imul(al1, bl6)) | 0;
        mid = (mid + Math.imul(al1, bh6)) | 0;
        mid = (mid + Math.imul(ah1, bl6)) | 0;
        hi = (hi + Math.imul(ah1, bh6)) | 0;
        lo = (lo + Math.imul(al0, bl7)) | 0;
        mid = (mid + Math.imul(al0, bh7)) | 0;
        mid = (mid + Math.imul(ah0, bl7)) | 0;
        hi = (hi + Math.imul(ah0, bh7)) | 0;
        let w7 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w7 >>> 26)) | 0;
        w7 &= 0x3ffffff;
        /* k = 8 */
        lo = Math.imul(al8, bl0);
        mid = Math.imul(al8, bh0);
        mid = (mid + Math.imul(ah8, bl0)) | 0;
        hi = Math.imul(ah8, bh0);
        lo = (lo + Math.imul(al7, bl1)) | 0;
        mid = (mid + Math.imul(al7, bh1)) | 0;
        mid = (mid + Math.imul(ah7, bl1)) | 0;
        hi = (hi + Math.imul(ah7, bh1)) | 0;
        lo = (lo + Math.imul(al6, bl2)) | 0;
        mid = (mid + Math.imul(al6, bh2)) | 0;
        mid = (mid + Math.imul(ah6, bl2)) | 0;
        hi = (hi + Math.imul(ah6, bh2)) | 0;
        lo = (lo + Math.imul(al5, bl3)) | 0;
        mid = (mid + Math.imul(al5, bh3)) | 0;
        mid = (mid + Math.imul(ah5, bl3)) | 0;
        hi = (hi + Math.imul(ah5, bh3)) | 0;
        lo = (lo + Math.imul(al4, bl4)) | 0;
        mid = (mid + Math.imul(al4, bh4)) | 0;
        mid = (mid + Math.imul(ah4, bl4)) | 0;
        hi = (hi + Math.imul(ah4, bh4)) | 0;
        lo = (lo + Math.imul(al3, bl5)) | 0;
        mid = (mid + Math.imul(al3, bh5)) | 0;
        mid = (mid + Math.imul(ah3, bl5)) | 0;
        hi = (hi + Math.imul(ah3, bh5)) | 0;
        lo = (lo + Math.imul(al2, bl6)) | 0;
        mid = (mid + Math.imul(al2, bh6)) | 0;
        mid = (mid + Math.imul(ah2, bl6)) | 0;
        hi = (hi + Math.imul(ah2, bh6)) | 0;
        lo = (lo + Math.imul(al1, bl7)) | 0;
        mid = (mid + Math.imul(al1, bh7)) | 0;
        mid = (mid + Math.imul(ah1, bl7)) | 0;
        hi = (hi + Math.imul(ah1, bh7)) | 0;
        lo = (lo + Math.imul(al0, bl8)) | 0;
        mid = (mid + Math.imul(al0, bh8)) | 0;
        mid = (mid + Math.imul(ah0, bl8)) | 0;
        hi = (hi + Math.imul(ah0, bh8)) | 0;
        let w8 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w8 >>> 26)) | 0;
        w8 &= 0x3ffffff;
        /* k = 9 */
        lo = Math.imul(al9, bl0);
        mid = Math.imul(al9, bh0);
        mid = (mid + Math.imul(ah9, bl0)) | 0;
        hi = Math.imul(ah9, bh0);
        lo = (lo + Math.imul(al8, bl1)) | 0;
        mid = (mid + Math.imul(al8, bh1)) | 0;
        mid = (mid + Math.imul(ah8, bl1)) | 0;
        hi = (hi + Math.imul(ah8, bh1)) | 0;
        lo = (lo + Math.imul(al7, bl2)) | 0;
        mid = (mid + Math.imul(al7, bh2)) | 0;
        mid = (mid + Math.imul(ah7, bl2)) | 0;
        hi = (hi + Math.imul(ah7, bh2)) | 0;
        lo = (lo + Math.imul(al6, bl3)) | 0;
        mid = (mid + Math.imul(al6, bh3)) | 0;
        mid = (mid + Math.imul(ah6, bl3)) | 0;
        hi = (hi + Math.imul(ah6, bh3)) | 0;
        lo = (lo + Math.imul(al5, bl4)) | 0;
        mid = (mid + Math.imul(al5, bh4)) | 0;
        mid = (mid + Math.imul(ah5, bl4)) | 0;
        hi = (hi + Math.imul(ah5, bh4)) | 0;
        lo = (lo + Math.imul(al4, bl5)) | 0;
        mid = (mid + Math.imul(al4, bh5)) | 0;
        mid = (mid + Math.imul(ah4, bl5)) | 0;
        hi = (hi + Math.imul(ah4, bh5)) | 0;
        lo = (lo + Math.imul(al3, bl6)) | 0;
        mid = (mid + Math.imul(al3, bh6)) | 0;
        mid = (mid + Math.imul(ah3, bl6)) | 0;
        hi = (hi + Math.imul(ah3, bh6)) | 0;
        lo = (lo + Math.imul(al2, bl7)) | 0;
        mid = (mid + Math.imul(al2, bh7)) | 0;
        mid = (mid + Math.imul(ah2, bl7)) | 0;
        hi = (hi + Math.imul(ah2, bh7)) | 0;
        lo = (lo + Math.imul(al1, bl8)) | 0;
        mid = (mid + Math.imul(al1, bh8)) | 0;
        mid = (mid + Math.imul(ah1, bl8)) | 0;
        hi = (hi + Math.imul(ah1, bh8)) | 0;
        lo = (lo + Math.imul(al0, bl9)) | 0;
        mid = (mid + Math.imul(al0, bh9)) | 0;
        mid = (mid + Math.imul(ah0, bl9)) | 0;
        hi = (hi + Math.imul(ah0, bh9)) | 0;
        let w9 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w9 >>> 26)) | 0;
        w9 &= 0x3ffffff;
        /* k = 10 */
        lo = Math.imul(al9, bl1);
        mid = Math.imul(al9, bh1);
        mid = (mid + Math.imul(ah9, bl1)) | 0;
        hi = Math.imul(ah9, bh1);
        lo = (lo + Math.imul(al8, bl2)) | 0;
        mid = (mid + Math.imul(al8, bh2)) | 0;
        mid = (mid + Math.imul(ah8, bl2)) | 0;
        hi = (hi + Math.imul(ah8, bh2)) | 0;
        lo = (lo + Math.imul(al7, bl3)) | 0;
        mid = (mid + Math.imul(al7, bh3)) | 0;
        mid = (mid + Math.imul(ah7, bl3)) | 0;
        hi = (hi + Math.imul(ah7, bh3)) | 0;
        lo = (lo + Math.imul(al6, bl4)) | 0;
        mid = (mid + Math.imul(al6, bh4)) | 0;
        mid = (mid + Math.imul(ah6, bl4)) | 0;
        hi = (hi + Math.imul(ah6, bh4)) | 0;
        lo = (lo + Math.imul(al5, bl5)) | 0;
        mid = (mid + Math.imul(al5, bh5)) | 0;
        mid = (mid + Math.imul(ah5, bl5)) | 0;
        hi = (hi + Math.imul(ah5, bh5)) | 0;
        lo = (lo + Math.imul(al4, bl6)) | 0;
        mid = (mid + Math.imul(al4, bh6)) | 0;
        mid = (mid + Math.imul(ah4, bl6)) | 0;
        hi = (hi + Math.imul(ah4, bh6)) | 0;
        lo = (lo + Math.imul(al3, bl7)) | 0;
        mid = (mid + Math.imul(al3, bh7)) | 0;
        mid = (mid + Math.imul(ah3, bl7)) | 0;
        hi = (hi + Math.imul(ah3, bh7)) | 0;
        lo = (lo + Math.imul(al2, bl8)) | 0;
        mid = (mid + Math.imul(al2, bh8)) | 0;
        mid = (mid + Math.imul(ah2, bl8)) | 0;
        hi = (hi + Math.imul(ah2, bh8)) | 0;
        lo = (lo + Math.imul(al1, bl9)) | 0;
        mid = (mid + Math.imul(al1, bh9)) | 0;
        mid = (mid + Math.imul(ah1, bl9)) | 0;
        hi = (hi + Math.imul(ah1, bh9)) | 0;
        let w10 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w10 >>> 26)) | 0;
        w10 &= 0x3ffffff;
        /* k = 11 */
        lo = Math.imul(al9, bl2);
        mid = Math.imul(al9, bh2);
        mid = (mid + Math.imul(ah9, bl2)) | 0;
        hi = Math.imul(ah9, bh2);
        lo = (lo + Math.imul(al8, bl3)) | 0;
        mid = (mid + Math.imul(al8, bh3)) | 0;
        mid = (mid + Math.imul(ah8, bl3)) | 0;
        hi = (hi + Math.imul(ah8, bh3)) | 0;
        lo = (lo + Math.imul(al7, bl4)) | 0;
        mid = (mid + Math.imul(al7, bh4)) | 0;
        mid = (mid + Math.imul(ah7, bl4)) | 0;
        hi = (hi + Math.imul(ah7, bh4)) | 0;
        lo = (lo + Math.imul(al6, bl5)) | 0;
        mid = (mid + Math.imul(al6, bh5)) | 0;
        mid = (mid + Math.imul(ah6, bl5)) | 0;
        hi = (hi + Math.imul(ah6, bh5)) | 0;
        lo = (lo + Math.imul(al5, bl6)) | 0;
        mid = (mid + Math.imul(al5, bh6)) | 0;
        mid = (mid + Math.imul(ah5, bl6)) | 0;
        hi = (hi + Math.imul(ah5, bh6)) | 0;
        lo = (lo + Math.imul(al4, bl7)) | 0;
        mid = (mid + Math.imul(al4, bh7)) | 0;
        mid = (mid + Math.imul(ah4, bl7)) | 0;
        hi = (hi + Math.imul(ah4, bh7)) | 0;
        lo = (lo + Math.imul(al3, bl8)) | 0;
        mid = (mid + Math.imul(al3, bh8)) | 0;
        mid = (mid + Math.imul(ah3, bl8)) | 0;
        hi = (hi + Math.imul(ah3, bh8)) | 0;
        lo = (lo + Math.imul(al2, bl9)) | 0;
        mid = (mid + Math.imul(al2, bh9)) | 0;
        mid = (mid + Math.imul(ah2, bl9)) | 0;
        hi = (hi + Math.imul(ah2, bh9)) | 0;
        let w11 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w11 >>> 26)) | 0;
        w11 &= 0x3ffffff;
        /* k = 12 */
        lo = Math.imul(al9, bl3);
        mid = Math.imul(al9, bh3);
        mid = (mid + Math.imul(ah9, bl3)) | 0;
        hi = Math.imul(ah9, bh3);
        lo = (lo + Math.imul(al8, bl4)) | 0;
        mid = (mid + Math.imul(al8, bh4)) | 0;
        mid = (mid + Math.imul(ah8, bl4)) | 0;
        hi = (hi + Math.imul(ah8, bh4)) | 0;
        lo = (lo + Math.imul(al7, bl5)) | 0;
        mid = (mid + Math.imul(al7, bh5)) | 0;
        mid = (mid + Math.imul(ah7, bl5)) | 0;
        hi = (hi + Math.imul(ah7, bh5)) | 0;
        lo = (lo + Math.imul(al6, bl6)) | 0;
        mid = (mid + Math.imul(al6, bh6)) | 0;
        mid = (mid + Math.imul(ah6, bl6)) | 0;
        hi = (hi + Math.imul(ah6, bh6)) | 0;
        lo = (lo + Math.imul(al5, bl7)) | 0;
        mid = (mid + Math.imul(al5, bh7)) | 0;
        mid = (mid + Math.imul(ah5, bl7)) | 0;
        hi = (hi + Math.imul(ah5, bh7)) | 0;
        lo = (lo + Math.imul(al4, bl8)) | 0;
        mid = (mid + Math.imul(al4, bh8)) | 0;
        mid = (mid + Math.imul(ah4, bl8)) | 0;
        hi = (hi + Math.imul(ah4, bh8)) | 0;
        lo = (lo + Math.imul(al3, bl9)) | 0;
        mid = (mid + Math.imul(al3, bh9)) | 0;
        mid = (mid + Math.imul(ah3, bl9)) | 0;
        hi = (hi + Math.imul(ah3, bh9)) | 0;
        let w12 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w12 >>> 26)) | 0;
        w12 &= 0x3ffffff;
        /* k = 13 */
        lo = Math.imul(al9, bl4);
        mid = Math.imul(al9, bh4);
        mid = (mid + Math.imul(ah9, bl4)) | 0;
        hi = Math.imul(ah9, bh4);
        lo = (lo + Math.imul(al8, bl5)) | 0;
        mid = (mid + Math.imul(al8, bh5)) | 0;
        mid = (mid + Math.imul(ah8, bl5)) | 0;
        hi = (hi + Math.imul(ah8, bh5)) | 0;
        lo = (lo + Math.imul(al7, bl6)) | 0;
        mid = (mid + Math.imul(al7, bh6)) | 0;
        mid = (mid + Math.imul(ah7, bl6)) | 0;
        hi = (hi + Math.imul(ah7, bh6)) | 0;
        lo = (lo + Math.imul(al6, bl7)) | 0;
        mid = (mid + Math.imul(al6, bh7)) | 0;
        mid = (mid + Math.imul(ah6, bl7)) | 0;
        hi = (hi + Math.imul(ah6, bh7)) | 0;
        lo = (lo + Math.imul(al5, bl8)) | 0;
        mid = (mid + Math.imul(al5, bh8)) | 0;
        mid = (mid + Math.imul(ah5, bl8)) | 0;
        hi = (hi + Math.imul(ah5, bh8)) | 0;
        lo = (lo + Math.imul(al4, bl9)) | 0;
        mid = (mid + Math.imul(al4, bh9)) | 0;
        mid = (mid + Math.imul(ah4, bl9)) | 0;
        hi = (hi + Math.imul(ah4, bh9)) | 0;
        let w13 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w13 >>> 26)) | 0;
        w13 &= 0x3ffffff;
        /* k = 14 */
        lo = Math.imul(al9, bl5);
        mid = Math.imul(al9, bh5);
        mid = (mid + Math.imul(ah9, bl5)) | 0;
        hi = Math.imul(ah9, bh5);
        lo = (lo + Math.imul(al8, bl6)) | 0;
        mid = (mid + Math.imul(al8, bh6)) | 0;
        mid = (mid + Math.imul(ah8, bl6)) | 0;
        hi = (hi + Math.imul(ah8, bh6)) | 0;
        lo = (lo + Math.imul(al7, bl7)) | 0;
        mid = (mid + Math.imul(al7, bh7)) | 0;
        mid = (mid + Math.imul(ah7, bl7)) | 0;
        hi = (hi + Math.imul(ah7, bh7)) | 0;
        lo = (lo + Math.imul(al6, bl8)) | 0;
        mid = (mid + Math.imul(al6, bh8)) | 0;
        mid = (mid + Math.imul(ah6, bl8)) | 0;
        hi = (hi + Math.imul(ah6, bh8)) | 0;
        lo = (lo + Math.imul(al5, bl9)) | 0;
        mid = (mid + Math.imul(al5, bh9)) | 0;
        mid = (mid + Math.imul(ah5, bl9)) | 0;
        hi = (hi + Math.imul(ah5, bh9)) | 0;
        let w14 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w14 >>> 26)) | 0;
        w14 &= 0x3ffffff;
        /* k = 15 */
        lo = Math.imul(al9, bl6);
        mid = Math.imul(al9, bh6);
        mid = (mid + Math.imul(ah9, bl6)) | 0;
        hi = Math.imul(ah9, bh6);
        lo = (lo + Math.imul(al8, bl7)) | 0;
        mid = (mid + Math.imul(al8, bh7)) | 0;
        mid = (mid + Math.imul(ah8, bl7)) | 0;
        hi = (hi + Math.imul(ah8, bh7)) | 0;
        lo = (lo + Math.imul(al7, bl8)) | 0;
        mid = (mid + Math.imul(al7, bh8)) | 0;
        mid = (mid + Math.imul(ah7, bl8)) | 0;
        hi = (hi + Math.imul(ah7, bh8)) | 0;
        lo = (lo + Math.imul(al6, bl9)) | 0;
        mid = (mid + Math.imul(al6, bh9)) | 0;
        mid = (mid + Math.imul(ah6, bl9)) | 0;
        hi = (hi + Math.imul(ah6, bh9)) | 0;
        let w15 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w15 >>> 26)) | 0;
        w15 &= 0x3ffffff;
        /* k = 16 */
        lo = Math.imul(al9, bl7);
        mid = Math.imul(al9, bh7);
        mid = (mid + Math.imul(ah9, bl7)) | 0;
        hi = Math.imul(ah9, bh7);
        lo = (lo + Math.imul(al8, bl8)) | 0;
        mid = (mid + Math.imul(al8, bh8)) | 0;
        mid = (mid + Math.imul(ah8, bl8)) | 0;
        hi = (hi + Math.imul(ah8, bh8)) | 0;
        lo = (lo + Math.imul(al7, bl9)) | 0;
        mid = (mid + Math.imul(al7, bh9)) | 0;
        mid = (mid + Math.imul(ah7, bl9)) | 0;
        hi = (hi + Math.imul(ah7, bh9)) | 0;
        let w16 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w16 >>> 26)) | 0;
        w16 &= 0x3ffffff;
        /* k = 17 */
        lo = Math.imul(al9, bl8);
        mid = Math.imul(al9, bh8);
        mid = (mid + Math.imul(ah9, bl8)) | 0;
        hi = Math.imul(ah9, bh8);
        lo = (lo + Math.imul(al8, bl9)) | 0;
        mid = (mid + Math.imul(al8, bh9)) | 0;
        mid = (mid + Math.imul(ah8, bl9)) | 0;
        hi = (hi + Math.imul(ah8, bh9)) | 0;
        let w17 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w17 >>> 26)) | 0;
        w17 &= 0x3ffffff;
        /* k = 18 */
        lo = Math.imul(al9, bl9);
        mid = Math.imul(al9, bh9);
        mid = (mid + Math.imul(ah9, bl9)) | 0;
        hi = Math.imul(ah9, bh9);
        let w18 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w18 >>> 26)) | 0;
        w18 &= 0x3ffffff;
        o[0] = w0;
        o[1] = w1;
        o[2] = w2;
        o[3] = w3;
        o[4] = w4;
        o[5] = w5;
        o[6] = w6;
        o[7] = w7;
        o[8] = w8;
        o[9] = w9;
        o[10] = w10;
        o[11] = w11;
        o[12] = w12;
        o[13] = w13;
        o[14] = w14;
        o[15] = w15;
        o[16] = w16;
        o[17] = w17;
        o[18] = w18;
        if (c !== 0) {
            o[19] = c;
            out.length++;
        }
        return out;
    }
    bigMulTo(self, num, out) {
        out.negative = num.negative ^ self.negative;
        out.length = self.length + num.length;
        let carry = 0;
        let hncarry = 0;
        let k = 0;
        for (; k < out.length - 1; k++) {
            // Sum all words with the same `i + j = k` and accumulate `ncarry`,
            // note that ncarry could be >= 0x3ffffff
            let ncarry = hncarry;
            hncarry = 0;
            let rword = carry & 0x3ffffff;
            const maxJ = Math.min(k, num.length - 1);
            for (let j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
                const i = k - j;
                const a = self.words[i] | 0;
                const b = num.words[j] | 0;
                const r = a * b;
                let lo = r & 0x3ffffff;
                ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
                lo = (lo + rword) | 0;
                rword = lo & 0x3ffffff;
                ncarry = (ncarry + (lo >>> 26)) | 0;
                hncarry += ncarry >>> 26;
                ncarry &= 0x3ffffff;
            }
            out.words[k] = rword;
            carry = ncarry;
            ncarry = hncarry;
        }
        if (carry !== 0) {
            out.words[k] = carry;
        }
        else {
            out.length--;
        }
        return out.strip();
    }
    /**
     * Performs multiplication between the BigNumber instance and a given BigNumber.
     * It chooses the multiplication method based on the lengths of the numbers to optimize execution time.
     *
     * @method mulTo
     * @param num - The BigNumber multiply with.
     * @param out - The BigNumber where to store the result.
     * @returns The BigNumber resulting from the multiplication operation.
     *
     * @example
     * const bn1 = new BigNumber('12345');
     * const bn2 = new BigNumber('23456');
     * const output = new BigNumber();
     * bn1.mulTo(bn2, output);
     */
    mulTo(num, out) {
        let res;
        const len = this.length + num.length;
        if (this.length === 10 && num.length === 10) {
            res = this.comb10MulTo(this, num, out);
        }
        else if (len < 63) {
            res = this.smallMulTo(this, num, out);
        }
        else {
            res = this.bigMulTo(this, num, out);
        }
        return res;
    }
    /**
     * Performs multiplication between the BigNumber instance and a given BigNumber.
     * It creates a new BigNumber to store the result.
     *
     * @method mul
     * @param num - The BigNumber to multiply with.
     * @returns The BigNumber resulting from the multiplication operation.
     *
     * @example
     * const bn1 = new BigNumber('12345');
     * const bn2 = new BigNumber('23456');
     * const result = bn1.mul(bn2);
     */
    mul(num) {
        const out = new BigNumber();
        out.words = new Array(this.length + num.length);
        return this.mulTo(num, out);
    }
    /**
     * Performs an in-place multiplication of the BigNumber instance by a given BigNumber.
     *
     * @method imul
     * @param num - The BigNumber to multiply with.
     * @returns The BigNumber itself after the multiplication.
     *
     * @example
     * const bn1 = new BigNumber('12345');
     * const bn2 = new BigNumber('23456');
     * bn1.imul(bn2);
     */
    imul(num) {
        return this.clone().mulTo(num, this);
    }
    /**
     * Performs an in-place multiplication of the BigNumber instance by a number.
     * This method asserts the input to be a number less than 0x4000000 to prevent overflowing.
     * If negavtive number is provided, the resulting BigNumber will be inversely negative.
     *
     * @method imuln
     * @param num - The number to multiply with.
     * @returns The BigNumber itself after the multiplication.
     *
     * @example
     * const bn = new BigNumber('12345');
     * bn.imuln(23456);
     */
    imuln(num) {
        const isNegNum = num < 0;
        if (isNegNum)
            num = -num;
        this.assert(typeof num === 'number');
        this.assert(num < 0x4000000);
        // Carry
        let carry = 0;
        let i = 0;
        for (; i < this.length; i++) {
            const w = (this.words[i] | 0) * num;
            const lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
            carry >>= 26;
            carry += (w / 0x4000000) | 0;
            // NOTE: lo is 27bit maximum
            carry += lo >>> 26;
            this.words[i] = lo & 0x3ffffff;
        }
        if (carry !== 0) {
            this.words[i] = carry;
            this.length++;
        }
        return isNegNum ? this.ineg() : this;
    }
    /**
     * Performs multiplication between the BigNumber instance and a number.
     * It performs the multiplication operation in-place to a cloned BigNumber.
     *
     * @method muln
     * @param num - The number to multiply with.
     * @returns The resulting BigNumber from the multiplication operation.
     *
     * @example
     * const bn = new BigNumber('12345');
     * const result = bn.muln(23456);
     */
    muln(num) {
        return this.clone().imuln(num);
    }
    /**
     * Squares the BigNumber instance.
     *
     * @method sqr
     * @returns The BigNumber squared.
     *
     * @example
     * const bn = new BigNumber('12345');
     * const result = bn.sqr();
     */
    sqr() {
        return this.mul(this);
    }
    /**
     * Performs in-place multiplication of the BigNumber instance by itself.
     *
     * @method isqr
     * @returns The result of multiplying the BigNumber instance by itself.
     *
     * @example
     * let myNumber = new BigNumber(4);
     * myNumber.isqr(); // Returns BigNumber of value 16
     */
    isqr() {
        return this.imul(this.clone());
    }
    /**
     * Raises the BigNumber instance to the power of the specified BigNumber.
     *
     * @method pow
     * @param num - The exponent to raise the BigNumber instance to.
     * @returns The result of raising the BigNumber instance to the power of num.
     *
     * @example
     * let base = new BigNumber(2);
     * let exponent = new BigNumber(3);
     * base.pow(exponent); // Returns BigNumber of value 8
     */
    pow(num) {
        const w = BigNumber.toBitArray(num);
        if (w.length === 0)
            return new BigNumber(1);
        // Skip leading zeroes
        /* eslint-disable @typescript-eslint/no-this-alias */
        let res = this;
        let i = 0;
        for (; i < w.length; i++, res = res.sqr()) {
            if (w[i] !== 0)
                break;
        }
        if (++i < w.length) {
            for (let q = res.sqr(); i < w.length; i++, q = q.sqr()) {
                if (w[i] === 0)
                    continue;
                res = res.mul(q);
            }
        }
        return res;
    }
    /**
     * Performs in-place bitwise left shift operation on the BigNumber instance.
     *
     * @method iushln
     * @param bits - The number of positions to shift.
     * @returns The BigNumber instance after performing the shift operation.
     *
     * @example
     * let myNumber = new BigNumber(4);
     * myNumber.iushln(2); // Returns BigNumber of value 16
     */
    iushln(bits) {
        this.assert(typeof bits === 'number' && bits >= 0);
        const r = bits % 26;
        const s = (bits - r) / 26;
        const carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);
        let i;
        if (r !== 0) {
            let carry = 0;
            for (i = 0; i < this.length; i++) {
                const newCarry = this.words[i] & carryMask;
                const c = ((this.words[i] | 0) - newCarry) << r;
                this.words[i] = c | carry;
                carry = newCarry >>> (26 - r);
            }
            if (carry !== 0) {
                this.words[i] = carry;
                this.length++;
            }
        }
        if (s !== 0) {
            for (i = this.length - 1; i >= 0; i--) {
                this.words[i + s] = this.words[i];
            }
            for (i = 0; i < s; i++) {
                this.words[i] = 0;
            }
            this.length += s;
        }
        return this.strip();
    }
    /**
     * Performs an in-place left shift operation on the BigNumber instance only if it is non-negative.
     *
     * @method ishln
     * @param bits - The number of positions to shift.
     * @returns The BigNumber instance after performing the shift operation.
     *
     * @example
     * let myNumber = new BigNumber(4);
     * myNumber.ishln(2); // Returns BigNumber of value 16
     */
    ishln(bits) {
        this.assert(this.negative === 0);
        return this.iushln(bits);
    }
    /**
     * Performs an in-place unsigned bitwise right shift operation on the BigNumber instance.
     *
     * @method iushrn
     * @param bits - The number of positions to shift.
     * @param hint - Lowest bit before trailing zeroes.
     * @param extended - To be filled with the bits that are shifted out.
     * @returns The BigNumber instance after performing the shift operation.
     *
     * @example
     * let myNumber = new BigNumber(16);
     * myNumber.iushrn(2); // Returns BigNumber of value 4
     */
    iushrn(bits, hint, extended) {
        this.assert(typeof bits === 'number' && bits >= 0);
        let h;
        if (typeof hint === 'number' && hint !== 0) {
            h = (hint - (hint % 26)) / 26;
        }
        else {
            h = 0;
        }
        const r = bits % 26;
        const s = Math.min((bits - r) / 26, this.length);
        const mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
        const maskedWords = extended;
        h -= s;
        h = Math.max(0, h);
        // Extended mode, copy masked part
        let i = 0;
        if (typeof maskedWords !== 'undefined') {
            for (; i < s; i++) {
                maskedWords.words[i] = this.words[i];
            }
            maskedWords.length = s;
        }
        if (s === 0) ;
        else if (this.length > s) {
            this.length -= s;
            for (i = 0; i < this.length; i++) {
                this.words[i] = this.words[i + s];
            }
        }
        else {
            this.words[0] = 0;
            this.length = 1;
        }
        let carry = 0;
        for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
            const word = this.words[i] | 0;
            this.words[i] = (carry << (26 - r)) | (word >>> r);
            carry = word & mask;
        }
        // Push carried bits as a mask
        if ((maskedWords != null) && carry !== 0) {
            maskedWords.words[maskedWords.length++] = carry;
        }
        if (this.length === 0) {
            this.words[0] = 0;
            this.length = 1;
        }
        return this.strip();
    }
    /**
     * Performs an in-place right shift operation on the BigNumber instance only if it is non-negative.
     *
     * @method ishrn
     * @param bits - The number of positions to shift.
     * @param hint - Lowest bit before trailing zeroes.
     * @param extended - To be filled with the bits that are shifted out.
     * @returns The BigNumber instance after performing the shift operation.
     *
     * @example
     * let myNumber = new BigNumber(16);
     * myNumber.ishrn(2); // Returns BigNumber of value 4
     */
    ishrn(bits, hint, extended) {
        this.assert(this.negative === 0);
        return this.iushrn(bits, hint, extended);
    }
    /**
     * Performs a bitwise left shift operation on a clone of the BigNumber instance.
     *
     * @method shln
     * @param bits - The number of positions to shift.
     * @returns A new BigNumber, which is the result of the shift operation.
     *
     * @example
     * let myNumber = new BigNumber(4);
     * let shiftedNumber = myNumber.shln(2);
     * console.log(shiftedNumber.toString()); // Outputs "16"
     */
    shln(bits) {
        return this.clone().ishln(bits);
    }
    /**
     * Performs an unsigned bitwise shift left operation on a clone of the BigNumber instance.
     *
     * @method ushln
     * @param bits - The number of bits to shift.
     * @returns A new BigNumber resulting from the shift operation.
     *
     * @example
     * let myNumber = new BigNumber(4);
     * let shiftedNumber = myNumber.ushln(2);
     * console.log(shiftedNumber.toString()); // Outputs "16"
     */
    ushln(bits) {
        return this.clone().iushln(bits);
    }
    /**
     * Performs a bitwise right shift operation on a clone of the BigNumber instance.
     *
     * @method shrn
     * @param bits - The number of bits to shift.
     * @returns A new BigNumber resulting from the shift operation.
     *
     * @example
     * let myNumber = new BigNumber(16);
     * let shiftedNumber = myNumber.shrn(3);
     * console.log(shiftedNumber.toString()); // Outputs "2"
     */
    shrn(bits) {
        return this.clone().ishrn(bits);
    }
    /**
     * Performs an unsigned bitwise shift right operation on a clone of the BigNumber instance.
     *
     * @method ushrn
     * @param bits - The number of bits to shift.
     * @returns A new BigNumber resulting from the shift operation.
     *
     * @example
     * let myNumber = new BigNumber(20);
     * let shiftedNumber = myNumber.ushrn(2);
     * console.log(shiftedNumber.toString()); // Outputs "5"
     */
    ushrn(bits) {
        return this.clone().iushrn(bits);
    }
    /**
     * Tests if the nth bit of the BigNumber is set.
     *
     * @method testn
     * @param bit - The position of the bit to test.
     * @returns A boolean indicating whether the nth bit is set.
     *
     * @example
     * let myNumber = new BigNumber(10); // 1010 in binary
     * myNumber.testn(1); // Returns true (indicating that the second bit from right is set)
     */
    testn(bit) {
        this.assert(typeof bit === 'number' && bit >= 0);
        const r = bit % 26;
        const s = (bit - r) / 26;
        const q = 1 << r;
        // Fast case: bit is much higher than all existing words
        if (this.length <= s)
            return false;
        // Check bit and return
        const w = this.words[s];
        return Boolean(w & q);
    }
    /**
     * Performs an in-place operation to keep only the lower bits of the number.
     * @method imaskn
     * @param bits - The number of lower bits to keep.
     * @returns Returns the BigNumber with only the specified lower bits.
     * @throws Will throw an error if bits is not a positive number.
     * @throws Will throw an error if initial BigNumber is negative as imaskn only works with positive numbers.
     * @example
     * const myNumber = new BigNumber(52);
     * myNumber.imaskn(2); // myNumber becomes 0 because lower 2 bits of 52 (110100) are 00.
     */
    imaskn(bits) {
        this.assert(typeof bits === 'number' && bits >= 0);
        const r = bits % 26;
        let s = (bits - r) / 26;
        this.assert(this.negative === 0, 'imaskn works only with positive numbers');
        if (this.length <= s) {
            return this;
        }
        if (r !== 0) {
            s++;
        }
        this.length = Math.min(s, this.length);
        if (r !== 0) {
            const mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
            this.words[this.length - 1] &= mask;
        }
        return this.strip();
    }
    /**
     * Returns a new BigNumber that keeps only the lower bits of the original number.
     * @method maskn
     * @param bits - The number of lower bits to keep.
     * @returns Returns a new BigNumber with only the specified lower bits of the original number.
     * @example
     * const myNumber = new BigNumber(52);
     * const newNumber = myNumber.maskn(2); // newNumber becomes 0, myNumber doesn't change.
     */
    maskn(bits) {
        return this.clone().imaskn(bits);
    }
    /**
     * Performs an in-place addition of a plain number to the BigNumber.
     * @method iaddn
     * @param num - The plain number to add.
     * @returns Returns the BigNumber after the addition.
     * @throws Will throw an error if num is not a number or is larger than 0x4000000.
     * @example
     * const myNumber = new BigNumber(50);
     * myNumber.iaddn(2); // myNumber becomes 52.
     */
    iaddn(num) {
        this.assert(typeof num === 'number');
        this.assert(num < 0x4000000, 'num is too large');
        if (num < 0)
            return this.isubn(-num);
        // Possible sign change
        if (this.negative !== 0) {
            if (this.length === 1 && (this.words[0] | 0) <= num) {
                this.words[0] = num - (this.words[0] | 0);
                this.negative = 0;
                return this;
            }
            this.negative = 0;
            this.isubn(num);
            this.negative = 1;
            return this;
        }
        // Add without checks
        return this._iaddn(num);
    }
    /**
     * A helper method for in-place addition, used when there are no sign changes or size checks needed.
     * @private
     * @method _iaddn
     * @param num - The plain number to add.
     * @returns Returns the BigNumber after the addition.
     */
    _iaddn(num) {
        this.words[0] += num;
        // Carry
        let i = 0;
        for (; i < this.length && this.words[i] >= 0x4000000; i++) {
            this.words[i] -= 0x4000000;
            if (i === this.length - 1) {
                this.words[i + 1] = 1;
            }
            else {
                this.words[i + 1]++;
            }
        }
        this.length = Math.max(this.length, i + 1);
        return this;
    }
    /**
     * Performs an in-place subtraction of a plain number from the BigNumber.
     * @method isubn
     * @param num - The plain number to subtract.
     * @returns Returns the BigNumber after the subtraction.
     * @throws Will throw an error if num is not a number or is larger than 0x4000000.
     * @example
     * const myNumber = new BigNumber(52);
     * myNumber.isubn(2); // myNumber becomes 50.
     */
    isubn(num) {
        this.assert(typeof num === 'number');
        this.assert(num < 0x4000000);
        if (num < 0)
            return this.iaddn(-num);
        if (this.negative !== 0) {
            this.negative = 0;
            this.iaddn(num);
            this.negative = 1;
            return this;
        }
        this.words[0] -= num;
        if (this.length === 1 && this.words[0] < 0) {
            this.words[0] = -this.words[0];
            this.negative = 1;
        }
        else {
            // Carry
            for (let i = 0; i < this.length && this.words[i] < 0; i++) {
                this.words[i] += 0x4000000;
                this.words[i + 1] -= 1;
            }
        }
        return this.strip();
    }
    /**
     * Returns a new BigNumber that is the result of adding a plain number to the original BigNumber.
     * @method addn
     * @param num - The plain number to add.
     * @returns Returns a new BigNumber which is the sum of the original BigNumber and the plain number.
     * @example
     * const myNumber = new BigNumber(50);
     * const newNumber = myNumber.addn(2); // newNumber becomes 52, myNumber doesn't change.
     */
    addn(num) {
        return this.clone().iaddn(num);
    }
    /**
     * Returns a new BigNumber that is the result of subtracting a plain number from the original BigNumber.
     * @method subn
     * @param num - The plain number to subtract.
     * @returns Returns a new BigNumber which is the difference of the original BigNumber and the plain number.
     * @example
     * const myNumber = new BigNumber(52);
     * const newNumber = myNumber.subn(2);  // newNumber becomes 50, myNumber doesn't change.
     */
    subn(num) {
        return this.clone().isubn(num);
    }
    /**
     * Performs an in-place operation to make the BigNumber an absolute value.
     * @method iabs
     * @returns Returns the BigNumber as an absolute value.
     * @example
     * const myNumber = new BigNumber(-50);
     * myNumber.iabs(); // myNumber becomes 50.
     */
    iabs() {
        this.negative = 0;
        return this;
    }
    /**
     * Obtains the absolute value of a BigNumber instance.
     * This operation does not affect the actual object but instead returns a new instance of BigNumber.
     *
     * @method abs
     * @returns a new BigNumber instance with the absolute value of the current instance.
     *
     * @example
     * let negativeNumber = new BigNumber(-10);
     * let absolute = negativeNumber.abs();
     * console.log(absolute.toString()); // Outputs: "10"
     */
    abs() {
        return this.clone().iabs();
    }
    /**
     * Perform an in-place shift left, subtract, and multiply operation on a BigNumber instance.
     * This method modifies the existing BigNumber instance.
     *
     * @method _ishlnsubmul
     * @param num - The BigNumber to be operated on.
     * @param mul - The multiplication factor.
     * @param shift - The number of places to shift left.
     * @returns the updated BigNumber instance after performing the in-place shift, subtract, and multiply operations.
     *
     * @example
     * let number = new BigNumber(10);
     * number._ishlnsubmul(new BigNumber(2), 3, 1);
     * console.log(number.toString()); // Outputs result after performing operations
     */
    _ishlnsubmul(num, mul, shift) {
        const len = num.length + shift;
        let i;
        this.expand(len);
        let w;
        let carry = 0;
        for (i = 0; i < num.length; i++) {
            w = (this.words[i + shift] | 0) + carry;
            const right = (num.words[i] | 0) * mul;
            w -= right & 0x3ffffff;
            carry = (w >> 26) - ((right / 0x4000000) | 0);
            this.words[i + shift] = w & 0x3ffffff;
        }
        for (; i < this.length - shift; i++) {
            w = (this.words[i + shift] | 0) + carry;
            carry = w >> 26;
            this.words[i + shift] = w & 0x3ffffff;
        }
        if (carry === 0)
            return this.strip();
        // Subtraction overflow
        this.assert(carry === -1, 'carry must be -1');
        carry = 0;
        for (i = 0; i < this.length; i++) {
            w = -(this.words[i] | 0) + carry;
            carry = w >> 26;
            this.words[i] = w & 0x3ffffff;
        }
        this.negative = 1;
        return this.strip();
    }
    /**
     * Performs a division on a BigNumber instance word-wise.
     *
     * This is a private method and should not be directly accessed.
     *
     * @method wordDiv
     * @private
     * @param num - The BigNumber to divide by.
     * @param mode - Specifies the operation mode as 'mod' for modulus or 'div' for division.
     * @returns Object with division (div) and modulo (mod) results, subject to the 'mode' specified.
     */
    wordDiv(num, mode) {
        let shift = this.length - num.length;
        let a = this.clone();
        let b = num;
        // Normalize
        let bhi = b.words[b.length - 1] | 0;
        const bhiBits = this.countWordBits(bhi);
        shift = 26 - bhiBits;
        if (shift !== 0) {
            b = b.ushln(shift);
            a.iushln(shift);
            bhi = b.words[b.length - 1] | 0;
        }
        // Initialize quotient
        const m = a.length - b.length;
        let q;
        if (mode !== 'mod') {
            q = new BigNumber();
            q.length = m + 1;
            q.words = new Array(q.length);
            for (let i = 0; i < q.length; i++) {
                q.words[i] = 0;
            }
        }
        const diff = a.clone()._ishlnsubmul(b, 1, m);
        if (diff.negative === 0) {
            a = diff;
            if (typeof q !== 'undefined') {
                q.words[m] = 1;
            }
        }
        for (let j = m - 1; j >= 0; j--) {
            let qj = (a.words[b.length + j] | 0) * 0x4000000 +
                (a.words[b.length + j - 1] | 0);
            // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
            // (0x7ffffff)
            qj = Math.min((qj / bhi) | 0, 0x3ffffff);
            a._ishlnsubmul(b, qj, j);
            while (a.negative !== 0) {
                qj--;
                a.negative = 0;
                a._ishlnsubmul(b, 1, j);
                if (!a.isZero()) {
                    a.negative ^= 1;
                }
            }
            if (typeof q !== 'undefined') {
                q.words[j] = qj;
            }
        }
        if (typeof q !== 'undefined') {
            q.strip();
        }
        a.strip();
        // Denormalize
        if (mode !== 'div' && shift !== 0) {
            a.iushrn(shift);
        }
        return {
            div: q ?? null,
            mod: a
        };
    }
    /**
     * Performs division and/or modulus operation on a BigNumber instance depending on the 'mode' parameter.
     * If the mode parameter is not provided, both division and modulus results are returned.
     *
     * @method divmod
     * @param num - The BigNumber to divide by.
     * @param mode - Specifies operation as 'mod' for modulus, 'div' for division, or both if not specified.
     * @param positive - Specifies if unsigned modulus is requested.
     * @returns Object with properties for division (div) and modulo (mod) results.
     *
     * @example
     * let number = new BigNumber(10);
     * let result = number.divmod(new BigNumber(3));
     * console.log(result.div.toString()); // Outputs: "3"
     * console.log(result.mod.toString()); // Outputs: "1"
     */
    divmod(num, mode, positive) {
        this.assert(!num.isZero());
        if (this.isZero()) {
            return {
                div: new BigNumber(0),
                mod: new BigNumber(0)
            };
        }
        let div, mod, res;
        if (this.negative !== 0 && num.negative === 0) {
            res = this.neg().divmod(num, mode);
            if (mode !== 'mod') {
                div = res.div.neg();
            }
            if (mode !== 'div') {
                mod = res.mod.neg();
                if (positive && mod.negative !== 0) {
                    mod.iadd(num);
                }
            }
            return {
                div,
                mod
            };
        }
        if (this.negative === 0 && num.negative !== 0) {
            res = this.divmod(num.neg(), mode);
            if (mode !== 'mod') {
                div = res.div.neg();
            }
            return {
                div,
                mod: res.mod
            };
        }
        if ((this.negative & num.negative) !== 0) {
            res = this.neg().divmod(num.neg(), mode);
            if (mode !== 'div') {
                mod = res.mod.neg();
                if (positive && mod.negative !== 0) {
                    mod.isub(num);
                }
            }
            return {
                div: res.div,
                mod
            };
        }
        // Both numbers are positive at this point
        // Strip both numbers to approximate shift value
        if (num.length > this.length || this.cmp(num) < 0) {
            return {
                div: new BigNumber(0),
                mod: this
            };
        }
        // Very short reduction
        if (num.length === 1) {
            if (mode === 'div') {
                return {
                    div: this.divn(num.words[0]),
                    mod: null
                };
            }
            if (mode === 'mod') {
                return {
                    div: null,
                    mod: new BigNumber(this.modrn(num.words[0]))
                };
            }
            return {
                div: this.divn(num.words[0]),
                mod: new BigNumber(this.modrn(num.words[0]))
            };
        }
        return this.wordDiv(num, mode);
    }
    /**
     * Divides a BigNumber instance by another BigNumber and returns result. This does not modify the actual object.
     *
     * @method div
     * @param num - The BigNumber to divide by.
     * @returns A new BigNumber instance of the division result.
     *
     * @example
     * let number = new BigNumber(10);
     * let result = number.div(new BigNumber(2));
     * console.log(result.toString()); // Outputs: "5"
     */
    div(num) {
        return this.divmod(num, 'div', false).div;
    }
    /**
     * Returns the remainder after division of one `BigNumber` by another `BigNumber`.
     *
     * @method mod
     * @param num - The divisor `BigNumber`.
     * @returns The remainder `BigNumber` after division.
     *
     * @example
     * const bigNum1 = new BigNumber('100');
     * const bigNum2 = new BigNumber('45');
     * const remainder = bigNum1.mod(bigNum2); // remainder here would be '10'
     */
    mod(num) {
        return this.divmod(num, 'mod', false).mod;
    }
    /**
     * Returns the remainder after unsigned division of one `BigNumber` by another `BigNumber`.
     *
     * @method umod
     * @param num - The divisor `BigNumber`.
     * @returns The remainder `BigNumber` after unsigned division.
     * Note: Here 'unsigned division' means that signs of the numbers are ignored.
     *
     * @example
     * const bigNum1 = new BigNumber('-100');
     * const bigNum2 = new BigNumber('45');
     * const remainder = bigNum1.umod(bigNum2); // remainder here would be '10' as signs are ignored.
     */
    umod(num) {
        return this.divmod(num, 'mod', true).mod;
    }
    /**
     * Returns the rounded quotient after division of one `BigNumber` by another `BigNumber`.
     *
     * @method divRound
     * @param num - The divisor `BigNumber`.
     * @returns The rounded quotient `BigNumber` after division.
     *
     * @example
     * const bigNum1 = new BigNumber('100');
     * const bigNum2 = new BigNumber('45');
     * const quotient = bigNum1.divRound(bigNum2); // quotient here would be '2'
     */
    divRound(num) {
        const dm = this.divmod(num);
        // Fast case - exact division
        if (dm.mod.isZero())
            return dm.div;
        const mod = dm.div.negative !== 0
            ? dm.mod.isub(num)
            : dm.mod;
        const half = num.ushrn(1);
        const r2 = num.andln(1);
        const cmp = mod.cmp(half);
        // Round down
        if (cmp < 0 || (r2 === 1 && cmp === 0))
            return dm.div;
        // Round up
        return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
    }
    /**
     * Returns the remainder after division of a `BigNumber` by a primitive number.
     *
     * @method modrn
     * @param num - The divisor primitive number.
     * @returns The remainder number after division.
     *
     * @example
     * const bigNum = new BigNumber('100');
     * const num = 45;
     * const remainder = bigNum.modrn(num); // remainder here would be '10'
     */
    modrn(num) {
        const isNegNum = num < 0;
        if (isNegNum)
            num = -num;
        this.assert(num <= 0x3ffffff);
        const p = (1 << 26) % num;
        let acc = 0;
        for (let i = this.length - 1; i >= 0; i--) {
            acc = (p * acc + (this.words[i] | 0)) % num;
        }
        return isNegNum ? -acc : acc;
    }
    /**
     * Performs an in-place division of a `BigNumber` by a primitive number.
     *
     * @method idivn
     * @param num - The divisor primitive number.
     * @returns The `BigNumber` itself after being divided.
     * Note: 'in-place' means that this operation modifies the original `BigNumber`.
     *
     * @example
     * const bigNum = new BigNumber('100');
     * const num = 45;
     * bigNum.idivn(num); // the bigNum here directly becomes '2'
     */
    idivn(num) {
        const isNegNum = num < 0;
        if (isNegNum)
            num = -num;
        this.assert(num <= 0x3ffffff);
        let carry = 0;
        for (let i = this.length - 1; i >= 0; i--) {
            const w = (this.words[i] | 0) + carry * 0x4000000;
            this.words[i] = (w / num) | 0;
            carry = w % num;
        }
        this.strip();
        return isNegNum ? this.ineg() : this;
    }
    /**
     * Returns the quotient `BigNumber` after division of one `BigNumber` by a primitive number.
     *
     * @method divn
     * @param num - The divisor primitive number.
     * @returns A new quotient `BigNumber` after division.
     *
     * @example
     * const bigNum = new BigNumber('100');
     * const num = 45;
     * const quotient = bigNum.divn(num); // quotient here would be '2'
     */
    divn(num) {
        return this.clone().idivn(num);
    }
    /**
     * Computes the Extended Euclidean Algorithm for this BigNumber and provided BigNumber `p`.
     * The Extended Euclidean Algorithm is a method to find the GCD (Greatest Common Divisor) and the multiplicative inverse in a modulus field.
     *
     * @method egcd
     * @param p - The `BigNumber` with which the Extended Euclidean Algorithm will be computed.
     * @returns An object `{a: BigNumber, b: BigNumber, gcd: BigNumber}` where `gcd` is the GCD of the numbers, `a` is the coefficient of `this`, and `b` is the coefficient of `p` in Bézout's identity.
     *
     * @example
     * const bigNum1 = new BigNumber('100');
     * const bigNum2 = new BigNumber('45');
     * const result = bigNum1.egcd(bigNum2);
     */
    egcd(p) {
        this.assert(p.negative === 0, 'p must not be negative');
        this.assert(!p.isZero(), 'p must not be zero');
        let x = this;
        const y = p.clone();
        if (x.negative !== 0) {
            x = x.umod(p);
        }
        else {
            x = x.clone();
        }
        // A * x + B * y = x
        const A = new BigNumber(1);
        const B = new BigNumber(0);
        // C * x + D * y = y
        const C = new BigNumber(0);
        const D = new BigNumber(1);
        let g = 0;
        while (x.isEven() && y.isEven()) {
            x.iushrn(1);
            y.iushrn(1);
            ++g;
        }
        const yp = y.clone();
        const xp = x.clone();
        while (!x.isZero()) {
            let i = 0;
            let im = 1;
            for (; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1)
                ;
            if (i > 0) {
                x.iushrn(i);
                while (i-- > 0) {
                    if (A.isOdd() || B.isOdd()) {
                        A.iadd(yp);
                        B.isub(xp);
                    }
                    A.iushrn(1);
                    B.iushrn(1);
                }
            }
            let j = 0;
            let jm = 1;
            for (; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1)
                ;
            if (j > 0) {
                y.iushrn(j);
                while (j-- > 0) {
                    if (C.isOdd() || D.isOdd()) {
                        C.iadd(yp);
                        D.isub(xp);
                    }
                    C.iushrn(1);
                    D.iushrn(1);
                }
            }
            if (x.cmp(y) >= 0) {
                x.isub(y);
                A.isub(C);
                B.isub(D);
            }
            else {
                y.isub(x);
                C.isub(A);
                D.isub(B);
            }
        }
        return {
            a: C,
            b: D,
            gcd: y.iushln(g)
        };
    }
    /**
     * Compute the multiplicative inverse of the current BigNumber in the modulus field specified by `p`.
     * The multiplicative inverse is a number which when multiplied with the current BigNumber gives '1' in the modulus field.
     *
     * @method _invmp
     * @param p - The `BigNumber` specifying the modulus field.
     * @returns The multiplicative inverse `BigNumber` in the modulus field specified by `p`.
     *
     * @example
     * const bigNum = new BigNumber('45');
     * const p = new BigNumber('100');
     * const inverse = bigNum._invmp(p); // inverse here would be a BigNumber such that (inverse*bigNum) % p = '1'
     */
    _invmp(p) {
        this.assert(p.negative === 0, 'p must not be negative');
        this.assert(!p.isZero(), 'p must not be zero');
        let a = this;
        const b = p.clone();
        if (a.negative !== 0) {
            a = a.umod(p);
        }
        else {
            a = a.clone();
        }
        const x1 = new BigNumber(1);
        const x2 = new BigNumber(0);
        const delta = b.clone();
        while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
            let i = 0;
            let im = 1;
            for (; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1)
                ;
            if (i > 0) {
                a.iushrn(i);
                while (i-- > 0) {
                    if (x1.isOdd()) {
                        x1.iadd(delta);
                    }
                    x1.iushrn(1);
                }
            }
            let j = 0;
            let jm = 1;
            for (; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1)
                ;
            if (j > 0) {
                b.iushrn(j);
                while (j-- > 0) {
                    if (x2.isOdd()) {
                        x2.iadd(delta);
                    }
                    x2.iushrn(1);
                }
            }
            if (a.cmp(b) >= 0) {
                a.isub(b);
                x1.isub(x2);
            }
            else {
                b.isub(a);
                x2.isub(x1);
            }
        }
        let res;
        if (a.cmpn(1) === 0) {
            res = x1;
        }
        else {
            res = x2;
        }
        if (res.cmpn(0) < 0) {
            res.iadd(p);
        }
        return res;
    }
    /**
     * Computes and returns the greatest common divisor (GCD) of this BigNumber and the provided BigNumber.
     *
     * @method gcd
     * @param num - The BigNumber with which to compute the GCD.
     * @returns The GCD of this BigNumber and the provided BigNumber.
     *
     * @example
     * let a = new BigNumber(48);
     * let b = new BigNumber(18);
     * let gcd = a.gcd(b);
     */
    gcd(num) {
        if (this.isZero())
            return num.abs();
        if (num.isZero())
            return this.abs();
        let a = this.clone();
        let b = num.clone();
        a.negative = 0;
        b.negative = 0;
        // Remove common factor of two
        let shift = 0;
        for (; a.isEven() && b.isEven(); shift++) {
            a.iushrn(1);
            b.iushrn(1);
        }
        do {
            while (a.isEven()) {
                a.iushrn(1);
            }
            while (b.isEven()) {
                b.iushrn(1);
            }
            const r = a.cmp(b);
            if (r < 0) {
                // Swap `a` and `b` to make `a` always bigger than `b`
                const t = a;
                a = b;
                b = t;
            }
            else if (r === 0 || b.cmpn(1) === 0) {
                break;
            }
            a.isub(b);
        } while (true);
        return b.iushln(shift);
    }
    /**
     * Computes and returns the modular multiplicative inverse of this BigNumber in the field defined by the provided BigNumber.
     *
     * @method invm
     * @param num - The BigNumber that defines the field.
     * @returns The modular multiplicative inverse of this BigNumber.
     *
     * @example
     * let a = new BigNumber(3);
     * let field = new BigNumber(7);
     * let inverse = a.invm(field);
     */
    invm(num) {
        return this.egcd(num).a.umod(num);
    }
    /**
     * Checks if this BigNumber is even.
     * An even number is an integer which is evenly divisible by two.
     *
     * @method isEven
     * @returns true if this BigNumber is even, else false.
     *
     * @example
     * let a = new BigNumber(4);
     * let isEven = a.isEven(); // true
     */
    isEven() {
        return (this.words[0] & 1) === 0;
    }
    /**
     * Checks if this BigNumber is Odd.
     * An odd number is an integer which is not evenly divisible by two.
     *
     * @method isOdd
     * @returns true if this BigNumber is Odd, else false.
     *
     * @example
     * let a = new BigNumber(3);
     * let isOdd = a.isOdd(); // true
     */
    isOdd() {
        return (this.words[0] & 1) === 1;
    }
    /**
     * Returns the result of bitwise AND operation between the least significant 26 bits of
     * this BigNumber and the provided number.
     * This method is mostly used to mask-off less significant bits.
     *
     * @method andln
     * @param num - The number to AND with.
     * @returns The result of the AND operation.
     *
     * @example
     * let a = new BigNumber(60);
     * let result = a.andln(13); // 12
     */
    andln(num) {
        return this.words[0] & num;
    }
    /**
     * Increments the value at the bit position specified by the input parameter.
     *
     * @method bincn
     * @param bit - The bit position to increment at.
     * @returns This BigNumber after incrementing at the specific bit position.
     *
     * @example
     * let a = new BigNumber(5);
     * a.bincn(2); // a = 7
     */
    bincn(bit) {
        this.assert(typeof bit === 'number');
        const r = bit % 26;
        const s = (bit - r) / 26;
        const q = 1 << r;
        // Fast case: bit is much higher than all existing words
        if (this.length <= s) {
            this.expand(s + 1);
            this.words[s] |= q;
            return this;
        }
        // Add bit and propagate, if needed
        let carry = q;
        let i = s;
        for (; carry !== 0 && i < this.length; i++) {
            let w = this.words[i] | 0;
            w += carry;
            carry = w >>> 26;
            w &= 0x3ffffff;
            this.words[i] = w;
        }
        if (carry !== 0) {
            this.words[i] = carry;
            this.length++;
        }
        return this;
    }
    /**
     * Checks if this BigNumber is Zero.
     * A BigNumber is zero if it only contains one word and that word is 0.
     *
     * @method isZero
     * @returns true if this BigNumber is Zero, else false.
     *
     * @example
     * let a = new BigNumber(0);
     * let isZero = a.isZero(); // true
     */
    isZero() {
        return this.length === 1 && this.words[0] === 0;
    }
    /**
     * Compares this BigNumber with the given number.
     * It returns -1 if this BigNumber is less than the number, 0 if they're equal, and 1 if the BigNumber is greater than the number.
     *
     * @method cmpn
     * @param num - The number to compare with.
     * @returns -1, 0, or 1 based on the comparison result.
     *
     * @example
     * let a = new BigNumber(15);
     * let result = a.cmpn(10); // 1
     */
    cmpn(num) {
        const negative = num < 0;
        if (this.negative !== 0 && !negative)
            return -1;
        if (this.negative === 0 && negative)
            return 1;
        this.strip();
        let res;
        if (this.length > 1) {
            res = 1;
        }
        else {
            if (negative) {
                num = -num;
            }
            this.assert(num <= 0x3ffffff, 'Number is too big');
            const w = this.words[0] | 0;
            res = w === num ? 0 : w < num ? -1 : 1;
        }
        if (this.negative !== 0)
            return (-res | 0);
        return res;
    }
    /**
     * Compare this big number with another big number.
     * @method cmp
     * @param num - The big number to compare with.
     * @returns Returns:
     * 1 if this big number is greater,
     * -1 if it's less,
     * 0 if they are equal.
     *
     * @example
     * import BigNumber from './BigNumber';
     * const bn1 = new BigNumber('10');
     * const bn2 = new BigNumber('6');
     * const comparisonResult = bn1.cmp(bn2); // 1 - because 10 is greater than 6
     */
    cmp(num) {
        if (this.negative !== 0 && num.negative === 0)
            return -1;
        if (this.negative === 0 && num.negative !== 0)
            return 1;
        const res = this.ucmp(num);
        if (this.negative !== 0)
            return (-res | 0);
        return res;
    }
    /**
     * Performs an unsigned comparison between this BigNumber instance and another.
     *
     * @method ucmp
     * @param num - The BigNumber instance to compare with.
     * @returns Returns 1 if this BigNumber is bigger, -1 if it is smaller, and 0 if they are equal.
     *
     * @example
     * let bigNumber1 = new BigNumber('1234');
     * let bigNumber2 = new BigNumber('2345');
     * let comparisonResult = bigNumber1.ucmp(bigNumber2); // Returns -1
     */
    ucmp(num) {
        // At this point both numbers have the same sign
        if (this.length > num.length)
            return 1;
        if (this.length < num.length)
            return -1;
        let res = 0;
        for (let i = this.length - 1; i >= 0; i--) {
            const a = this.words[i] | 0;
            const b = num.words[i] | 0;
            if (a === b)
                continue;
            if (a < b) {
                res = -1;
            }
            else if (a > b) {
                res = 1;
            }
            break;
        }
        return res;
    }
    /**
     * Checks if this BigNumber instance is greater than a number.
     *
     * @method gtn
     * @param num - The number to compare with.
     * @returns Returns true if this BigNumber is greater than the number, false otherwise.
     *
     * @example
     * let bigNumber = new BigNumber('2345');
     * let isGreater = bigNumber.gtn(1234); // Returns true
     */
    gtn(num) {
        return this.cmpn(num) === 1;
    }
    /**
     * Checks if this BigNumber instance is greater than another BigNumber.
     *
     * @method gt
     * @param num - The BigNumber to compare with.
     * @returns Returns true if this BigNumber is greater than the other BigNumber, false otherwise.
     *
     * @example
     * let bigNumber1 = new BigNumber('2345');
     * let bigNumber2 = new BigNumber('1234');
     * let isGreater = bigNumber1.gt(bigNumber2); // Returns true
     */
    gt(num) {
        return this.cmp(num) === 1;
    }
    /**
     * Checks if this BigNumber instance is greater than or equal to a number.
     *
     * @method gten
     * @param num - The number to compare with.
     * @returns Returns true if this BigNumber is greater than or equal to the number, false otherwise.
     *
     * @example
     * let bigNumber = new BigNumber('1234');
     * let isGreaterOrEqual = bigNumber.gten(1234); // Returns true
     */
    gten(num) {
        return this.cmpn(num) >= 0;
    }
    /**
     * Checks if this BigNumber instance is greater than or equal to another BigNumber.
     *
     * @method gte
     * @param num - The BigNumber to compare with.
     * @returns Returns true if this BigNumber is greater than or equal to the other BigNumber, false otherwise.
     *
     * @example
     * let bigNumber1 = new BigNumber('1234');
     * let bigNumber2 = new BigNumber('1234');
     * let isGreaterOrEqual = bigNumber1.gte(bigNumber2); // Returns true
     */
    gte(num) {
        return this.cmp(num) >= 0;
    }
    /**
     * Checks if this BigNumber instance is less than a number.
     *
     * @method ltn
     * @param num - The number to compare with.
     * @returns Returns true if this BigNumber is less than the number, false otherwise.
     *
     * @example
     * let bigNumber = new BigNumber('1234');
     * let isLess = bigNumber.ltn(2345); // Returns true
     */
    ltn(num) {
        return this.cmpn(num) === -1;
    }
    /**
     * Checks if this BigNumber instance is less than another BigNumber.
     *
     * @method lt
     * @param num - The BigNumber to compare with.
     * @returns Returns true if this BigNumber is less than the other BigNumber, false otherwise.
     *
     * @example
     * let bigNumber1 = new BigNumber('1234');
     * let bigNumber2 = new BigNumber('2345');
     * let isLess = bigNumber1.lt(bigNumber2); // Returns true
     */
    lt(num) {
        return this.cmp(num) === -1;
    }
    /**
     * Checks if this BigNumber instance is less than or equal to a number.
     *
     * @method lten
     * @param num - The number to compare with.
     * @returns Returns true if this BigNumber is less than or equal to the number, false otherwise.
     *
     * @example
     * let bigNumber = new BigNumber('2345');
     * let isLessOrEqual = bigNumber.lten(2345); // Returns true
     */
    lten(num) {
        return this.cmpn(num) <= 0;
    }
    /**
     * Checks if this BigNumber instance is less than or equal to another BigNumber.
     *
     * @method lte
     * @param num - The BigNumber to compare with.
     * @returns Returns true if this BigNumber is less than or equal to the other BigNumber, false otherwise.
     *
     * @example
     * let bigNumber1 = new BigNumber('2345');
     * let bigNumber2 = new BigNumber('2345');
     * let isLessOrEqual = bigNumber1.lte(bigNumber2); // Returns true
     */
    lte(num) {
        return this.cmp(num) <= 0;
    }
    /**
     * Checks if this BigNumber instance is equal to a number.
     *
     * @method eqn
     * @param num - The number to compare with.
     * @returns Returns true if this BigNumber is equal to the number, false otherwise.
     *
     * @example
     * let bigNumber = new BigNumber('1234');
     * let isEqual = bigNumber.eqn(1234); // Returns true
     */
    eqn(num) {
        return this.cmpn(num) === 0;
    }
    /**
     * Compares the current BigNumber with the given number and returns whether they're equal.
     *
     * @method eq
     * @param num - The number to compare equality with.
     * @returns Returns true if the current BigNumber is equal to the provided number, otherwise false.
     *
     * @example
     * let bigNum = new BigNumber(10);
     * bigNum.eq(new BigNumber(10)); // true
     */
    eq(num) {
        return this.cmp(num) === 0;
    }
    /**
     * Converts a BigNumber to a reduction context ensuring the number is a positive integer and is not already in a reduction context.
     * Throws an error in case the number is either negative or already in a reduction context.
     *
     * @method toRed
     * @param ctx - The ReductionContext to convert the BigNumber to.
     * @returns Returns the BigNumber in the given ReductionContext.
     *
     * @example
     * let bigNum = new BigNumber(10);
     * let redCtx = new ReductionContext();
     * bigNum.toRed(redCtx);
     */
    toRed(ctx) {
        this.assert(this.red == null, 'Already a number in reduction context');
        this.assert(this.negative === 0, 'red works only with positives');
        return ctx.convertTo(this).forceRed(ctx);
    }
    /**
     * Converts a BigNumber from a reduction context, making sure the number is indeed in a reduction context.
     * Throws an error in case the number is not in a reduction context.
     *
     * @method fromRed
     * @returns Returns the BigNumber out of the ReductionContext.
     *
     * @example
     * let bigNum = new BigNumber(10);
     * let redCtx = new ReductionContext();
     * bigNum.toRed(redCtx);
     * bigNum.fromRed();
     */
    fromRed() {
        this.assert(this.red, 'fromRed works only with numbers in reduction context');
        return (this.red).convertFrom(this);
    }
    /**
     * Forces the current BigNumber into a reduction context, irrespective of the BigNumber's current state.
     *
     * @method forceRed
     * @param ctx - The ReductionContext to forcefully convert the BigNumber to.
     * @returns Returns the BigNumber in the given ReductionContext.
     *
     * @example
     * let bigNum = new BigNumber(10);
     * let redCtx = new ReductionContext();
     * bigNum.forceRed(redCtx);
     */
    forceRed(ctx) {
        // this.assert(this.red == null, 'Already a number in reduction context')
        this.red = ctx;
        return this;
    }
    /**
     * Performs addition operation of the current BigNumber with the given number in a reduction context.
     * Throws an error in case the number is not in a reduction context.
     *
     * @method redAdd
     * @param num - The number to add to the current BigNumber.
     * @returns Returns a new BigNumber that's the sum of the current BigNumber and the provided number in the reduction context.
     *
     * @example
     * let bigNum = new BigNumber(10);
     * let redCtx = new ReductionContext();
     * bigNum.toRed(redCtx);
     * bigNum.redAdd(new BigNumber(20)); // returns a BigNumber of 30 in reduction context
     */
    redAdd(num) {
        this.assert(this.red, 'redAdd works only with red numbers');
        return (this.red).add(this, num);
    }
    /**
     * Performs in-place addition operation of the current BigNumber with the given number in a reduction context.
     * Throws an error in case the number is not in a reduction context.
     *
     * @method redIAdd
     * @param num - The number to add to the current BigNumber.
     * @returns Returns the modified current BigNumber after adding the provided number in the reduction context.
     *
     * @example
     * let bigNum = new BigNumber(10);
     * let redCtx = new ReductionContext();
     * bigNum.toRed(redCtx);
     * bigNum.redIAdd(new BigNumber(20)); // modifies the bigNum to 30 in reduction context
     */
    redIAdd(num) {
        this.assert(this.red, 'redIAdd works only with red numbers');
        return (this.red).iadd(this, num);
    }
    /**
     * Performs subtraction operation of the current BigNumber with the given number in a reduction context.
     * Throws an error in case the number is not in a reduction context.
     *
     * @method redSub
     * @param num - The number to subtract from the current BigNumber.
     * @returns Returns a new BigNumber that's the subtraction result of the current BigNumber and the provided number in the reduction context.
     *
     * @example
     * let bigNum = new BigNumber(30);
     * let redCtx = new ReductionContext();
     * bigNum.toRed(redCtx);
     * bigNum.redSub(new BigNumber(20)); // returns a BigNumber of 10 in reduction context
     */
    redSub(num) {
        this.assert(this.red, 'redSub works only with red numbers');
        return (this.red).sub(this, num);
    }
    /**
     * Performs in-place subtraction operation of the current BigNumber with the given number in a reduction context.
     * Throws an error in case the number is not in a reduction context.
     *
     * @method redISub
     * @param num - The number to subtract from the current BigNumber.
     * @returns Returns the modified current BigNumber after subtracting the provided number in the reduction context.
     *
     * @example
     * let bigNum = new BigNumber(30);
     * let redCtx = new ReductionContext();
     * bigNum.toRed(redCtx);
     * bigNum.redISub(new BigNumber(20)); // modifies the bigNum to 10 in reduction context
     */
    redISub(num) {
        this.assert(this.red, 'redISub works only with red numbers');
        return (this.red).isub(this, num);
    }
    /**
     * Performs the shift left operation on the current BigNumber in the reduction context.
     * Throws an error in case the number is not in a reduction context.
     *
     * @method redShl
     * @param num - The positions to shift left the current BigNumber.
     * @returns Returns a new BigNumber after performing the shift left operation on the current BigNumber in the reduction context.
     *
     * @example
     * let bigNum = new BigNumber(1);
     * let redCtx = new ReductionContext();
     * bigNum.toRed(redCtx);
     * bigNum.redShl(2); // returns a BigNumber of 4 in reduction context
     */
    redShl(num) {
        this.assert(this.red, 'redShl works only with red numbers');
        return (this.red).shl(this, num);
    }
    /**
     * Performs multiplication operation of the current BigNumber with the given number in a reduction context.
     * Throws an error in case the number is not in a reduction context.
     *
     * @method redMul
     * @param num - The number to multiply with the current BigNumber.
     * @returns Returns a new BigNumber that's the product of the current BigNumber and the provided number in the reduction context.
     *
     * @example
     * let bigNum = new BigNumber(10);
     * let redCtx = new ReductionContext();
     * bigNum.toRed(redCtx);
     * bigNum.redMul(new BigNumber(20)); // returns a BigNumber of 200 in reduction context
     */
    redMul(num) {
        this.assert(this.red, 'redMul works only with red numbers');
        (this.red).verify2(this, num);
        return (this.red).mul(this, num);
    }
    /**
     * Performs an in-place multiplication of this BigNumber instance with another BigNumber within a reduction context.
     * Expects that this BigNumber is within the reduction context i.e., it has been reduced.
     *
     * @method redIMul
     * @param num - The BigNumber to multiply with the current BigNumber.
     * @returns A BigNumber that is the result of the in-place multiplication operation, within the reduction context.
     *
     * @example
     * let bigNum1 = new BigNumber('10').toRed(someRed);
     * let bigNum2 = new BigNumber('5');
     * bigNum1.redIMul(bigNum2);
     */
    redIMul(num) {
        this.assert(this.red, 'redMul works only with red numbers');
        (this.red).verify2(this, num);
        return (this.red).imul(this, num);
    }
    /**
     * Square of a "red" (reduced) BigNumber.
     * This function squares the calling BigNumber and returns the result.
     * It only works if the number is "reduced". A number is considered reduced
     * if it has a `red` field that points to a reduction context object.
     *
     * @method redSqr
     * @throws If the BigNumber is not reduced
     * @returns The square of the BigNumber
     *
     * @example
     * const num = new BigNumber('25').toRed(someRed);
     * const result = num.redSqr();
     * console.log(result.toString()); // Outputs: '625' mod the red value
     */
    redSqr() {
        this.assert(this.red, 'redSqr works only with red numbers');
        (this.red).verify1(this);
        return (this.red).sqr(this);
    }
    /**
     * In-place square of a "red" (reduced) BigNumber.
     * This function squares the calling BigNumber and overwrites it with the result.
     * It only works if the number is "reduced". A number is considered reduced
     * if it has a `red` field that points to a reduction context object.
     *
     * @method redISqr
     * @throws If the BigNumber is not reduced
     * @returns This BigNumber squared in place
     *
     * @example
     * const num = new BigNumber('25').toRed(someRed);
     * num.redISqr();
     * console.log(num.toString()); // Outputs: '625' mod the red value
     */
    redISqr() {
        this.assert(this.red, 'redISqr works only with red numbers');
        (this.red).verify1(this);
        return (this.red).isqr(this);
    }
    /**
     * Square root of a "red" (reduced) BigNumber.
     * This function calculates the square root of the calling BigNumber
     * and returns the result. It only works if the number is "reduced".
     * A number is considered reduced if it has a `red`
     * field that points to a reduction context object.
     *
     * @method redSqrt
     * @throws If the BigNumber is not reduced
     * @returns The square root of the BigNumber
     *
     * @example
     * const num = new BigNumber('4').toRed(someRed);
     * const result = num.redSqrt();
     * console.log(result.toString()); // Outputs: '2' mod the red value
     */
    redSqrt() {
        this.assert(this.red, 'redSqrt works only with red numbers');
        (this.red).verify1(this);
        return (this.red).sqrt(this);
    }
    /**
     * Find multiplicative inverse (reciprocal) in respect to reduction context.
     * The method works only on numbers that have a reduction context set.
     *
     * @method redInvm
     * @returns Returns a BigNumber that is multiplicative inverse in respect to the reduction context.
     * @throws Will throw an error if this number does not have a reduction context.
     *
     * @example
     * let a = new BigNumber('2345', 16);
     * a.red = someReductionContext;
     * let aInverse = a.redInvm();
     */
    redInvm() {
        this.assert(this.red, 'redInvm works only with red numbers');
        (this.red).verify1(this);
        return (this.red).invm(this);
    }
    /**
     * Find negative version of this number in respect to reduction context.
     * The method works only on numbers that have a reduction context set.
     *
     * @method redNeg
     * @returns Returns a BigNumber that is the negative version of this number in respect to the reduction context.
     * @throws Will throw an error if this number does not have a reduction context.
     *
     * @example
     * let a = new BigNumber('2345', 16);
     * a.red = someReductionContext;
     * let aNeg = a.redNeg();
     */
    redNeg() {
        this.assert(this.red, 'redNeg works only with red numbers');
        (this.red).verify1(this);
        return (this.red).neg(this);
    }
    /**
     * Raises this number to the power of 'num', in respect to reduction context.
     * Note that 'num' must not have a reduction context set.
     *
     * @method redPow
     * @param num - The exponent to raise this number to.
     * @returns Returns a BigNumber that is this number raised to the power of 'num', in respect to the reduction context.
     * @throws Will throw an error if this number does not have a reduction context or 'num' has a reduction context.
     *
     * @example
     * let a = new BigNumber(3);
     * a.red = someReductionContext;
     * let b = new BigNumber(3);
     * let result = a.redPow(b);  // equivalent to (a^b) mod red
     */
    redPow(num) {
        this.assert((this.red != null) && (num.red == null), 'redPow(normalNum)');
        (this.red).verify1(this);
        return (this.red).pow(this, num);
    }
    /**
     * Creates a BigNumber from a hexadecimal string.
     *
     * @static
     * @method fromHex
     * @param hex - The hexadecimal string to create a BigNumber from.
     * @returns Returns a BigNumber created from the hexadecimal input string.
     *
     * @example
     * const exampleHex = 'a1b2c3';
     * const bigNumber = BigNumber.fromHex(exampleHex);
     */
    static fromHex(hex, endian) {
        if (endian === 'big') {
            return new BigNumber(hex, 16);
        }
        else {
            return new BigNumber(hex, 16, 'le');
        }
    }
    /**
     * Converts this BigNumber to a hexadecimal string.
     *
     * @method toHex
     * @param length - The minimum length of the hex string
     * @returns Returns a string representing the hexadecimal value of this BigNumber.
     *
     * @example
     * const bigNumber = new BigNumber(255);
     * const hex = bigNumber.toHex();
     */
    toHex(length = 0) {
        return this.toString('hex', length * 2);
    }
    /**
     * Creates a BigNumber from a JSON-serialized string.
     *
     * @static
     * @method fromJSON
     * @param str - The JSON-serialized string to create a BigNumber from.
     * @returns Returns a BigNumber created from the JSON input string.
     *
     * @example
     * const serialized = '{"type":"BigNumber","hex":"a1b2c3"}';
     * const bigNumber = BigNumber.fromJSON(serialized);
     */
    static fromJSON(str) {
        return new BigNumber(str);
    }
    /**
     * Creates a BigNumber from a number.
     *
     * @static
     * @method fromNumber
     * @param n - The number to create a BigNumber from.
     * @returns Returns a BigNumber equivalent to the input number.
     *
     * @example
     * const number = 1234;
     * const bigNumber = BigNumber.fromNumber(number);
     */
    static fromNumber(n) {
        return new BigNumber(n);
    }
    /**
     * Creates a BigNumber from a string, considering an optional base.
     *
     * @static
     * @method fromString
     * @param str - The string to create a BigNumber from.
     * @param base - The base used for conversion. If not provided, base 10 is assumed.
     * @returns Returns a BigNumber equivalent to the string after conversion from the specified base.
     *
     * @example
     * const str = '1234';
     * const bigNumber = BigNumber.fromString(str, 16);
     */
    static fromString(str, base) {
        return new BigNumber(str, base);
    }
    /**
     * Creates a BigNumber from a signed magnitude number.
     *
     * @static
     * @method fromSm
     * @param num - The signed magnitude number to convert to a BigNumber.
     * @param endian - Defines endianess. If not provided, big endian is assumed.
     * @returns Returns a BigNumber equivalent to the signed magnitude number interpreted with specified endianess.
     *
     * @example
     * const num = [0x81]
     * const bigNumber = BigNumber.fromSm(num, { endian: 'little' }); // equivalent to BigNumber from '-1'
     */
    static fromSm(num, endian = 'big') {
        let n = num;
        if (num.length === 0) {
            return new BigNumber(0);
        }
        if (endian === 'little') {
            n = [...n];
            n = n.reverse();
        }
        if ((n[0] & 0x80) !== 0) {
            n = [...n];
            n[0] = n[0] & 0x7f;
            return new BigNumber(n).neg();
        }
        else {
            return new BigNumber(n);
        }
    }
    /**
     * Converts this BigNumber to a signed magnitude number.
     *
     * @method toSm
     * @param endian - Defines endianess. If not provided, big endian is assumed.
     * @returns Returns an array equivalent to this BigNumber interpreted as a signed magnitude with specified endianess.
     *
     * @example
     * const bigNumber = new BigNumber(-1);
     * const num = bigNumber.toSm('little'); // [0x81]
     */
    toSm(endian = 'big') {
        let num;
        if (this.cmpn(0) === -1) {
            num = this.neg().toArray();
            if ((num[0] & 0x80) !== 0) {
                num = [0x80, ...num];
            }
            else {
                num[0] = num[0] | 0x80;
            }
        }
        else {
            num = this.toArray();
            if ((num[0] & 0x80) !== 0) {
                num = [0x00, ...num];
            }
        }
        if (num.length === 1 && num[0] === 0) {
            num = [];
        }
        if (endian === 'little') {
            num = num.reverse();
        }
        return num;
    }
    /**
     * Creates a BigNumber from a number representing the "bits" value in a block header.
     *
     * @static
     * @method fromBits
     * @param bits - The number representing the bits value in a block header.
     * @param strict - If true, an error is thrown if the number has negative bit set.
     * @returns Returns a BigNumber equivalent to the "bits" value in a block header.
     * @throws Will throw an error if `strict` is `true` and the number has negative bit set.
     *
     * @example
     * const bits = 0x1d00ffff;
     * const bigNumber = BigNumber.fromBits(bits);
     */
    static fromBits(bits, strict = false) {
        // Convert to signed 32-bit value manually without using Buffer
        bits = (bits & 0x80000000) ? bits - 0x100000000 : bits;
        if (strict && (bits & 0x00800000) !== 0) {
            throw new Error('negative bit set');
        }
        const nsize = bits >> 24;
        const nword = bits & 0x007fffff;
        // Manually create the byte array (similar to the original buffer)
        let bytes = [
            (nword >> 24) & 0xFF,
            (nword >> 16) & 0xFF,
            (nword >> 8) & 0xFF,
            nword & 0xFF
        ];
        if (nsize <= 3) {
            bytes = bytes.slice(1, 1 + nsize); // remove the most significant byte(s) as necessary
        }
        else {
            // add trailing zeros (similar to the original buffer fill)
            for (let i = 0; i < nsize - 3; i++) {
                bytes.push(0);
            }
        }
        // Adjust for sign if the negative bit was set, and then convert array to BigNumber
        if ((bits & 0x00800000) !== 0) {
            return new BigNumber(bytes).neg();
        }
        else {
            return new BigNumber(bytes);
        }
    }
    /**
     * Converts this BigNumber to a number representing the "bits" value in a block header.
     *
     * @method toBits
     * @returns Returns a number equivalent to the "bits" value in a block header.
     *
     * @example
     * const bigNumber = new BigNumber(1);
     * const bits = bigNumber.toBits();
     */
    toBits() {
        let byteArray;
        if (this.ltn(0)) {
            byteArray = this.neg().toArray('be');
        }
        else {
            byteArray = this.toArray('be');
        }
        // Ensure that the byte array is of a minimum size
        while (byteArray.length < 4) {
            byteArray.unshift(0);
        }
        // For the case where byteArray represents '00', the bits should be 0x00000000
        if (byteArray.every(byte => byte === 0)) {
            return 0x00000000;
        }
        // Remove leading zeros from the byte array for further processing
        while (byteArray[0] === 0) {
            byteArray.shift();
        }
        let nsize = byteArray.length;
        // We're interested in the first three bytes for the "nword"
        // or in smaller cases, what's available
        let nword = byteArray.slice(0, 3).reduce((acc, val) => (acc * 256) + val, 0);
        // Ensure we don't have the sign bit set initially
        if ((nword & 0x800000) !== 0) {
            // If the 24th bit is set, we're going to need one more byte to represent this number
            byteArray.unshift(0); // Unshift a zero byte to not change the actual number
            nsize += 1;
            nword >>>= 8; // Shift right to make room for that byte
        }
        // Encode size and the 3 bytes into "nword"
        let bits = (nsize << 24) | nword;
        if (this.ltn(0)) {
            // If the number is negative, set the 0x00800000 bit to indicate sign
            bits |= 0x00800000;
        }
        return bits >>> 0; // Convert to unsigned 32-bit integer
    }
    /**
     * Creates a BigNumber from the format used in Bitcoin scripts.
     *
     * @static
     * @method fromScriptNum
     * @param num - The number in the format used in Bitcoin scripts.
     * @param requireMinimal - If true, non-minimally encoded values will throw an error.
     * @param maxNumSize - The maximum allowed size for the number. If not provided, defaults to 4.
     * @returns Returns a BigNumber equivalent to the number used in a Bitcoin script.
     * @throws Will throw an error if `requireMinimal` is `true` and the value is non-minimally encoded. Will throw an error if number length is greater than `maxNumSize`.
     *
     * @example
     * const num = [0x02, 0x01]
     * const bigNumber = BigNumber.fromScriptNum(num, true, 5)
     */
    static fromScriptNum(num, requireMinimal, maxNumSize) {
        if (maxNumSize === undefined) {
            maxNumSize = Number.MAX_SAFE_INTEGER;
        }
        if (num.length > maxNumSize) {
            throw new Error('script number overflow');
        }
        if (requireMinimal && num.length > 0) {
            // Check that the number is encoded with the minimum possible
            // number of bytes.
            //
            // If the most-significant-byte - excluding the sign bit - is zero
            // then we're not minimal. Note how this test also rejects the
            // negative-zero encoding, 0x80.
            if ((num[num.length - 1] & 0x7f) === 0) {
                // One exception: if there's more than one byte and the most
                // significant bit of the second-most-significant-byte is set
                // it would conflict with the sign bit. An example of this case
                // is +-255, which encode to 0xff00 and 0xff80 respectively.
                // (big-endian).
                if (num.length <= 1 || (num[num.length - 2] & 0x80) === 0) {
                    throw new Error('non-minimally encoded script number');
                }
            }
        }
        return BigNumber.fromSm(num, 'little');
    }
    /**
     * Converts this BigNumber to a number in the format used in Bitcoin scripts.
     *
     * @method toScriptNum
     * @returns Returns the equivalent to this BigNumber as a Bitcoin script number.
     *
     * @example
     * const bigNumber = new BigNumber(258)
     * const num = bigNumber.toScriptNum() // equivalent to bigNumber.toSm('little')
     */
    toScriptNum() {
        return this.toSm('little');
    }
}

/**
 * A representation of a pseudo-Mersenne prime.
 * A pseudo-Mersenne prime has the general form 2^n - k, where n and k are integers.
 *
 * @class Mersenne
 *
 * @property name - The identifier for the Mersenne instance.
 * @property p - BigNumber equivalent to 2^n - k.
 * @property k - The constant subtracted from 2^n to derive a pseudo-Mersenne prime.
 * @property n - The exponent which determines the magnitude of the prime.
 */
class Mersenne {
    name;
    p;
    k;
    n;
    tmp;
    /**
     * @constructor
     * @param name - An identifier for the Mersenne instance.
     * @param p - A string representation of the pseudo-Mersenne prime, expressed in hexadecimal.
     *
     * @example
     * const mersenne = new Mersenne('M31', '7FFFFFFF');
     */
    constructor(name, p) {
        // P = 2 ^ N - K
        this.name = name;
        this.p = new BigNumber(p, 16);
        this.n = this.p.bitLength();
        this.k = new BigNumber(1).iushln(this.n).isub(this.p);
        this.tmp = this._tmp();
    }
    /**
     * Creates a temporary BigNumber structure for computations,
     * ensuring the appropriate number of words are initially allocated.
     *
     * @method _tmp
     * @returns A BigNumber with scaled size depending on prime magnitude.
     */
    _tmp() {
        const tmp = new BigNumber();
        tmp.words = new Array(Math.ceil(this.n / 13));
        return tmp;
    }
    /**
     * Reduces an input BigNumber in place, under the assumption that
     * it is less than the square of the pseudo-Mersenne prime.
     *
     * @method ireduce
     * @param num - The BigNumber to be reduced.
     * @returns The reduced BigNumber.
     *
     * @example
     * const reduced = mersenne.ireduce(new BigNumber('2345', 16));
     */
    ireduce(num) {
        // Assumes that `num` is less than `P^2`
        // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
        let r = num;
        let rlen;
        do {
            this.split(r, this.tmp);
            r = this.imulK(r);
            r = r.iadd(this.tmp);
            rlen = r.bitLength();
        } while (rlen > this.n);
        const cmp = rlen < this.n ? -1 : r.ucmp(this.p);
        if (cmp === 0) {
            r.words[0] = 0;
            r.length = 1;
        }
        else if (cmp > 0) {
            r.isub(this.p);
        }
        else {
            if (r.strip !== undefined) {
                // r is a BN v4 instance
                r.strip();
            }
            else {
                // r is a BN v5 instance
                r.strip();
            }
        }
        return r;
    }
    /**
     * Shifts bits of the input BigNumber to the right, in place,
     * to meet the magnitude of the pseudo-Mersenne prime.
     *
     * @method split
     * @param input - The BigNumber to be shifted.
     * @param out - The BigNumber to hold the shifted result.
     *
     * @example
     * mersenne.split(new BigNumber('2345', 16), new BigNumber());
     */
    split(input, out) {
        input.iushrn(this.n, 0, out);
    }
    /**
     * Performs an in-place multiplication of the parameter by constant k.
     *
     * @method imulK
     * @param num - The BigNumber to multiply with k.
     * @returns The result of the multiplication, in BigNumber format.
     *
     * @example
     * const multiplied = mersenne.imulK(new BigNumber('2345', 16));
     */
    imulK(num) {
        return num.imul(this.k);
    }
}

/**
 * A class representing K-256, a prime number with optimizations, specifically used in the secp256k1 curve.
 * It extends the functionalities of the Mersenne class.
 * K-256 prime is represented as 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f'
 *
 * @class K256
 * @extends {Mersenne}
 *
 * @example
 * const k256 = new K256();
 */
class K256 extends Mersenne {
    /**
     * Constructor for the K256 class.
     * Creates an instance of K256 using the super constructor from Mersenne.
     *
     * @constructor
     *
     * @example
     * const k256 = new K256();
     */
    constructor() {
        super('k256', 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
    }
    /**
     * Splits a BigNumber into a new BigNumber based on specific computation
     * rules. This method modifies the input and output big numbers.
     *
     * @method split
     * @param input - The BigNumber to be split.
     * @param output - The BigNumber that results from the split.
     *
     * @example
     * const input = new BigNumber(3456);
     * const output = new BigNumber(0);
     * k256.split(input, output);
     */
    split(input, output) {
        // 256 = 9 * 26 + 22
        const mask = 0x3fffff;
        const outLen = Math.min(input.length, 9);
        let i = 0;
        for (; i < outLen; i++) {
            output.words[i] = input.words[i];
        }
        output.length = outLen;
        if (input.length <= 9) {
            input.words[0] = 0;
            input.length = 1;
            return;
        }
        // Shift by 9 limbs
        let prev = input.words[9];
        output.words[output.length++] = prev & mask;
        for (i = 10; i < input.length; i++) {
            const next = input.words[i] | 0;
            input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
            prev = next;
        }
        prev >>>= 22;
        input.words[i - 10] = prev;
        if (prev === 0 && input.length > 10) {
            input.length -= 10;
        }
        else {
            input.length -= 9;
        }
    }
    /**
     * Multiplies a BigNumber ('num') with the constant 'K' in-place and returns the result.
     * 'K' is equal to 0x1000003d1 or in decimal representation: [ 64, 977 ].
     *
     * @method imulK
     * @param num - The BigNumber to multiply with K.
     * @returns Returns the mutated BigNumber after multiplication.
     *
     * @example
     * const number = new BigNumber(12345);
     * const result = k256.imulK(number);
     */
    imulK(num) {
        // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
        num.words[num.length] = 0;
        num.words[num.length + 1] = 0;
        num.length += 2;
        // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
        let lo = 0;
        for (let i = 0; i < num.length; i++) {
            const w = num.words[i] | 0;
            lo += w * 0x3d1;
            num.words[i] = lo & 0x3ffffff;
            lo = w * 0x40 + ((lo / 0x4000000) | 0);
        }
        // Fast length reduction
        if (num.words[num.length - 1] === 0) {
            num.length--;
            if (num.words[num.length - 1] === 0) {
                num.length--;
            }
        }
        return num;
    }
}

/**
 * A base reduction engine that provides several arithmetic operations over
 * big numbers under a modulus context. It's particularly suitable for
 * calculations required in cryptography algorithms and encoding schemas.
 *
 * @class ReductionContext
 *
 * @property prime - The prime number utilised in the reduction context, typically an instance of Mersenne class.
 * @property m - The modulus used for reduction operations.
 */
class ReductionContext {
    prime;
    m;
    /**
     * Constructs a new ReductionContext.
     *
     * @constructor
     * @param m - A BigNumber representing the modulus, or 'k256' to create a context for Koblitz curve.
     *
     * @example
     * new ReductionContext(new BigNumber(11));
     * new ReductionContext('k256');
     */
    constructor(m) {
        if (m === 'k256') {
            const prime = new K256();
            this.m = prime.p;
            this.prime = prime;
        }
        else {
            this.assert(m.gtn(1), 'modulus must be greater than 1');
            this.m = m;
            this.prime = null;
        }
    }
    /**
     * Asserts that given value is truthy. Throws an Error with a provided message
     * if the value is falsy.
     *
     * @private
     * @param val - The value to be checked.
     * @param msg - The error message to be thrown if the value is falsy.
     *
     * @example
     * this.assert(1 < 2, '1 is not less than 2');
     * this.assert(2 < 1, '2 is less than 1'); // throws an Error with message '2 is less than 1'
     */
    assert(val, msg = 'Assertion failed') {
        if (!val)
            throw new Error(msg);
    }
    /**
     * Verifies that a BigNumber is positive and red. Throws an error if these
     * conditions are not met.
     *
     * @param a - The BigNumber to be verified.
     *
     * @example
     * this.verify1(new BigNumber(10).toRed());
     * this.verify1(new BigNumber(-10).toRed()); //throws an Error
     * this.verify1(new BigNumber(10)); //throws an Error
     */
    verify1(a) {
        this.assert(a.negative === 0, 'red works only with positives');
        this.assert(a.red, 'red works only with red numbers');
    }
    /**
     * Verifies that two BigNumbers are both positive and red. Also checks
     * that they have the same reduction context. Throws an error if these
     * conditions are not met.
     *
     * @param a - The first BigNumber to be verified.
     * @param b - The second BigNumber to be verified.
     *
     * @example
     * this.verify2(new BigNumber(10).toRed(this), new BigNumber(20).toRed(this));
     * this.verify2(new BigNumber(-10).toRed(this), new BigNumber(20).toRed(this)); //throws an Error
     * this.verify2(new BigNumber(10).toRed(this), new BigNumber(20)); //throws an Error
     */
    verify2(a, b) {
        this.assert((a.negative | b.negative) === 0, 'red works only with positives');
        this.assert((a.red != null) && a.red === b.red, 'red works only with red numbers');
    }
    /**
     * Performs an in-place reduction of the given BigNumber by the modulus of the reduction context, 'm'.
     *
     * @method imod
     *
     * @param a - BigNumber to be reduced.
     *
     * @returns Returns the reduced result.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(7));
     * context.imod(new BigNumber(19)); // Returns 5
     */
    imod(a) {
        if (this.prime != null)
            return this.prime.ireduce(a).forceRed(this);
        BigNumber.move(a, a.umod(this.m).forceRed(this));
        return a;
    }
    /**
     * Negates a BigNumber in the context of the modulus.
     *
     * @method neg
     *
     * @param a - BigNumber to negate.
     *
     * @returns Returns the negation of 'a' in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(7));
     * context.neg(new BigNumber(3)); // Returns 4
     */
    neg(a) {
        if (a.isZero()) {
            return a.clone();
        }
        return this.m.sub(a).forceRed(this);
    }
    /**
     * Performs the addition operation on two BigNumbers in the reduction context.
     *
     * @method add
     *
     * @param a - First BigNumber to add.
     * @param b - Second BigNumber to add.
     *
     * @returns Returns the result of 'a + b' in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(5));
     * context.add(new BigNumber(2), new BigNumber(4)); // Returns 1
     */
    add(a, b) {
        this.verify2(a, b);
        const res = a.add(b);
        if (res.cmp(this.m) >= 0) {
            res.isub(this.m);
        }
        return res.forceRed(this);
    }
    /**
     * Performs an in-place addition operation on two BigNumbers in the reduction context
     * in order to avoid creating a new BigNumber, it modifies the first one with the result.
     *
     * @method iadd
     *
     * @param a - First BigNumber to add.
     * @param b - Second BigNumber to add.
     *
     * @returns Returns the modified 'a' after addition with 'b' in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(5));
     * const a = new BigNumber(2);
     * context.iadd(a, new BigNumber(4)); // Modifies 'a' to be 1
     */
    iadd(a, b) {
        this.verify2(a, b);
        const res = a.iadd(b);
        if (res.cmp(this.m) >= 0) {
            res.isub(this.m);
        }
        return res;
    }
    /**
     * Subtracts one BigNumber from another BigNumber in the reduction context.
     *
     * @method sub
     *
     * @param a - BigNumber to be subtracted from.
     * @param b - BigNumber to subtract.
     *
     * @returns Returns the result of 'a - b' in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(7));
     * context.sub(new BigNumber(3), new BigNumber(2)); // Returns 1
     */
    sub(a, b) {
        this.verify2(a, b);
        const res = a.sub(b);
        if (res.cmpn(0) < 0) {
            res.iadd(this.m);
        }
        return res.forceRed(this);
    }
    /**
     * Performs in-place subtraction of one BigNumber from another in the reduction context,
     * it modifies the first BigNumber with the result.
     *
     * @method isub
     *
     * @param a - BigNumber to be subtracted from.
     * @param b - BigNumber to subtract.
     *
     * @returns Returns the modified 'a' after subtraction of 'b' in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(5));
     * const a = new BigNumber(4);
     * context.isub(a, new BigNumber(2)); // Modifies 'a' to be 2
     */
    isub(a, b) {
        this.verify2(a, b);
        const res = a.isub(b);
        if (res.cmpn(0) < 0) {
            res.iadd(this.m);
        }
        return res;
    }
    /**
     * Performs bitwise shift left operation on a BigNumber in the reduction context.
     *
     * @method shl
     *
     * @param a - BigNumber to perform shift on.
     * @param num - The number of positions to shift.
     *
     * @returns Returns the result of shifting 'a' left by 'num' positions in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(32));
     * context.shl(new BigNumber(4), 2); // Returns 16
     */
    shl(a, num) {
        this.verify1(a);
        return this.imod(a.ushln(num));
    }
    /**
     * Performs in-place multiplication of two BigNumbers in the reduction context,
     * modifying the first BigNumber with the result.
     *
     * @method imul
     *
     * @param a - First BigNumber to multiply.
     * @param b - Second BigNumber to multiply.
     *
     * @returns Returns the modified 'a' after multiplication with 'b' in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(7));
     * const a = new BigNumber(3);
     * context.imul(a, new BigNumber(2)); // Modifies 'a' to be 6
     */
    imul(a, b) {
        this.verify2(a, b);
        return this.imod(a.imul(b));
    }
    /**
     * Multiplies two BigNumbers in the reduction context.
     *
     * @method mul
     *
     * @param a - First BigNumber to multiply.
     * @param b - Second BigNumber to multiply.
     *
     * @returns Returns the result of 'a * b' in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(7));
     * context.mul(new BigNumber(3), new BigNumber(2)); // Returns 6
     */
    mul(a, b) {
        this.verify2(a, b);
        return this.imod(a.mul(b));
    }
    /**
     * Calculates the square of a BigNumber in the reduction context,
     * modifying the original BigNumber with the result.
     *
     * @method isqr
     *
     * @param a - BigNumber to be squared.
     *
     * @returns Returns the squared 'a' in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(7));
     * const a = new BigNumber(3);
     * context.isqr(a); // Modifies 'a' to be 2 (9 % 7 = 2)
     */
    isqr(a) {
        return this.imul(a, a.clone());
    }
    /**
     * Calculates the square of a BigNumber in the reduction context.
     *
     * @method sqr
     *
     * @param a - BigNumber to be squared.
     *
     * @returns Returns the result of 'a^2' in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(7));
     * context.sqr(new BigNumber(3)); // Returns 2 (9 % 7 = 2)
     */
    sqr(a) {
        return this.mul(a, a);
    }
    /**
     * Calculates the square root of a BigNumber in the reduction context.
     *
     * @method sqrt
     *
     * @param a - The BigNumber to calculate the square root of.
     *
     * @returns Returns the square root of 'a' in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(9));
     * context.sqrt(new BigNumber(4)); // Returns 2
     */
    sqrt(a) {
        if (a.isZero())
            return a.clone();
        const mod3 = this.m.andln(3);
        this.assert(mod3 % 2 === 1);
        // Fast case
        if (mod3 === 3) {
            const pow = this.m.add(new BigNumber(1)).iushrn(2);
            return this.pow(a, pow);
        }
        // Tonelli-Shanks algorithm (Totally unoptimized and slow)
        //
        // Find Q and S, that Q * 2 ^ S = (P - 1)
        const q = this.m.subn(1);
        let s = 0;
        while (!q.isZero() && q.andln(1) === 0) {
            s++;
            q.iushrn(1);
        }
        this.assert(!q.isZero());
        const one = new BigNumber(1).toRed(this);
        const nOne = one.redNeg();
        // Find quadratic non-residue
        // NOTE: Max is such because of generalized Riemann hypothesis.
        const lpow = this.m.subn(1).iushrn(1);
        const zl = this.m.bitLength();
        const z = new BigNumber(2 * zl * zl).toRed(this);
        while (this.pow(z, lpow).cmp(nOne) !== 0) {
            z.redIAdd(nOne);
        }
        let c = this.pow(z, q);
        let r = this.pow(a, q.addn(1).iushrn(1));
        let t = this.pow(a, q);
        let m = s;
        while (t.cmp(one) !== 0) {
            let tmp = t;
            let i = 0;
            for (; tmp.cmp(one) !== 0; i++) {
                tmp = tmp.redSqr();
            }
            this.assert(i < m);
            const b = this.pow(c, new BigNumber(1).iushln(m - i - 1));
            r = r.redMul(b);
            c = b.redSqr();
            t = t.redMul(c);
            m = i;
        }
        return r;
    }
    /**
     * Calculates the multiplicative inverse of a BigNumber in the reduction context.
     *
     * @method invm
     *
     * @param a - The BigNumber to find the multiplicative inverse of.
     *
     * @returns Returns the multiplicative inverse of 'a' in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(11));
     * context.invm(new BigNumber(3)); // Returns 4 (3*4 mod 11 = 1)
     */
    invm(a) {
        const inv = a._invmp(this.m);
        if (inv.negative !== 0) {
            inv.negative = 0;
            return this.imod(inv).redNeg();
        }
        else {
            return this.imod(inv);
        }
    }
    /**
     * Raises a BigNumber to a power in the reduction context.
     *
     * @method pow
     *
     * @param a - The BigNumber to be raised to a power.
     * @param num - The power to raise the BigNumber to.
     *
     * @returns Returns the result of 'a' raised to the power of 'num' in the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(7));
     * context.pow(new BigNumber(3), new BigNumber(2)); // Returns 2 (3^2 % 7)
     */
    pow(a, num) {
        if (num.isZero())
            return new BigNumber(1).toRed(this);
        if (num.cmpn(1) === 0)
            return a.clone();
        const windowSize = 4;
        const wnd = new Array(1 << windowSize);
        wnd[0] = new BigNumber(1).toRed(this);
        wnd[1] = a;
        let i = 2;
        for (; i < wnd.length; i++) {
            wnd[i] = this.mul(wnd[i - 1], a);
        }
        let res = wnd[0];
        let current = 0;
        let currentLen = 0;
        let start = num.bitLength() % 26;
        if (start === 0) {
            start = 26;
        }
        for (i = num.length - 1; i >= 0; i--) {
            const word = num.words[i];
            for (let j = start - 1; j >= 0; j--) {
                const bit = (word >> j) & 1;
                if (res !== wnd[0]) {
                    res = this.sqr(res);
                }
                if (bit === 0 && current === 0) {
                    currentLen = 0;
                    continue;
                }
                current <<= 1;
                current |= bit;
                currentLen++;
                if (currentLen !== windowSize && (i !== 0 || j !== 0))
                    continue;
                res = this.mul(res, wnd[current]);
                currentLen = 0;
                current = 0;
            }
            start = 26;
        }
        return res;
    }
    /**
     * Converts a BigNumber to its equivalent in the reduction context.
     *
     * @method convertTo
     *
     * @param num - The BigNumber to convert to the reduction context.
     *
     * @returns Returns the converted BigNumber compatible with the reduction context.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(7));
     * context.convertTo(new BigNumber(8)); // Returns 1 (8 % 7)
     */
    convertTo(num) {
        const r = num.umod(this.m);
        return r === num ? r.clone() : r;
    }
    /**
     * Converts a BigNumber from reduction context to its regular form.
     *
     * @method convertFrom
     *
     * @param num - The BigNumber to convert from the reduction context.
     *
     * @returns Returns the converted BigNumber in its regular form.
     *
     * @example
     * const context = new ReductionContext(new BigNumber(7));
     * const a = context.convertTo(new BigNumber(8)); // 'a' is now 1 in the reduction context
     * context.convertFrom(a); // Returns 1
     */
    convertFrom(num) {
        const res = num.clone();
        res.red = null;
        return res;
    }
}

/**
 * Represents a Montgomery reduction context, which is a mathematical method
 * for performing modular multiplication without division.
 *
 * Montgomery reduction is an algorithm used mainly in cryptography which can
 * help to speed up calculations in contexts where there are many repeated
 * computations.
 *
 * This class extends the `ReductionContext` class.
 *
 * @class MontgomoryMethod
 * @extends {ReductionContext}
 *
 * @property shift - The number of bits in the modulus.
 * @property r - The 2^shift, shifted left by the bit length of modulus `m`.
 * @property r2 - The square of `r` modulo `m`.
 * @property rinv - The modular multiplicative inverse of `r` mod `m`.
 * @property minv - The modular multiplicative inverse of `m` mod `r`.
 */
class MontgomoryMethod extends ReductionContext {
    shift;
    r;
    r2;
    rinv;
    minv;
    /**
     * @constructor
     * @param m - The modulus to be used for the Montgomery method reductions.
     */
    constructor(m) {
        super(m);
        this.shift = this.m.bitLength();
        if (this.shift % 26 !== 0) {
            this.shift += 26 - (this.shift % 26);
        }
        this.r = new BigNumber(1).iushln(this.shift);
        this.r2 = this.imod(this.r.sqr());
        this.rinv = this.r._invmp(this.m);
        this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
        this.minv = this.minv.umod(this.r);
        this.minv = this.r.sub(this.minv);
    }
    /**
     * Converts a number into the Montgomery domain.
     *
     * @method convertTo
     * @param num - The number to be converted into the Montgomery domain.
     * @returns The result of the conversion into the Montgomery domain.
     *
     * @example
     * const montMethod = new MontgomoryMethod(m);
     * const convertedNum = montMethod.convertTo(num);
     */
    convertTo(num) {
        return this.imod(num.ushln(this.shift));
    }
    /**
     * Converts a number from the Montgomery domain back to the original domain.
     *
     * @method convertFrom
     * @param num - The number to be converted from the Montgomery domain.
     * @returns The result of the conversion from the Montgomery domain.
     *
     * @example
     * const montMethod = new MontgomoryMethod(m);
     * const convertedNum = montMethod.convertFrom(num);
     */
    convertFrom(num) {
        const r = this.imod(num.mul(this.rinv));
        r.red = null;
        return r;
    }
    /**
     * Performs an in-place multiplication of two numbers in the Montgomery domain.
     *
     * @method imul
     * @param a - The first number to multiply.
     * @param b - The second number to multiply.
     * @returns The result of the in-place multiplication.
     *
     * @example
     * const montMethod = new MontgomoryMethod(m);
     * const product = montMethod.imul(a, b);
     */
    imul(a, b) {
        if (a.isZero() || b.isZero()) {
            a.words[0] = 0;
            a.length = 1;
            return a;
        }
        const t = a.imul(b);
        const c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
        const u = t.isub(c).iushrn(this.shift);
        let res = u;
        if (u.cmp(this.m) >= 0) {
            res = u.isub(this.m);
        }
        else if (u.cmpn(0) < 0) {
            res = u.iadd(this.m);
        }
        return res.forceRed(this);
    }
    /**
     * Performs the multiplication of two numbers in the Montgomery domain.
     *
     * @method mul
     * @param a - The first number to multiply.
     * @param b - The second number to multiply.
     * @returns The result of the multiplication.
     *
     * @example
     * const montMethod = new MontgomoryMethod(m);
     * const product = montMethod.mul(a, b);
     */
    mul(a, b) {
        if (a.isZero() || b.isZero())
            return new BigNumber(0).forceRed(this);
        const t = a.mul(b);
        const c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
        const u = t.isub(c).iushrn(this.shift);
        let res = u;
        if (u.cmp(this.m) >= 0) {
            res = u.isub(this.m);
        }
        else if (u.cmpn(0) < 0) {
            res = u.iadd(this.m);
        }
        return res.forceRed(this);
    }
    /**
     * Calculates the modular multiplicative inverse of a number in the Montgomery domain.
     *
     * @method invm
     * @param a - The number to compute the modular multiplicative inverse of.
     * @returns The modular multiplicative inverse of 'a'.
     *
     * @example
     * const montMethod = new MontgomoryMethod(m);
     * const inverse = montMethod.invm(a);
     */
    invm(a) {
        // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
        const res = this.imod(a._invmp(this.m).mul(this.r2));
        return res.forceRed(this);
    }
}

/**
 * Base class for Point (affine coordinates) and JacobianPoint classes,
 * defining their curve and type.
 */
class BasePoint {
    curve;
    type;
    precomputed;
    constructor(type) {
        this.curve = new Curve();
        this.type = type;
        this.precomputed = null;
    }
}

/**
 * The `JacobianPoint` class extends the `BasePoint` class for handling Jacobian coordinates on an Elliptic Curve.
 * This class defines the properties and the methods needed to work with points in Jacobian coordinates.
 *
 * The Jacobian coordinates represent a point (x, y, z) on an Elliptic Curve such that the usual (x, y) coordinates are given by (x/z^2, y/z^3).
 *
 * @property x - The `x` coordinate of the point in the Jacobian form.
 * @property y - The `y` coordinate of the point in the Jacobian form.
 * @property z - The `z` coordinate of the point in the Jacobian form.
 * @property zOne - Flag that indicates if the `z` coordinate is one.
 *
 * @example
 * const pointJ = new JacobianPoint('3', '4', '1');
 */
class JacobianPoint extends BasePoint {
    x;
    y;
    z;
    zOne;
    /**
     * Constructs a new `JacobianPoint` instance.
     *
     * @param x - If `null`, the x-coordinate will default to the curve's defined 'one' constant.
     * If `x` is not a BigNumber, `x` will be converted to a `BigNumber` assuming it is a hex string.
     *
     * @param y - If `null`, the y-coordinate will default to the curve's defined 'one' constant.
     * If `y` is not a BigNumber, `y` will be converted to a `BigNumber` assuming it is a hex string.
     *
     * @param z - If `null`, the z-coordinate will default to 0.
     * If `z` is not a BigNumber, `z` will be converted to a `BigNumber` assuming it is a hex string.
     *
     * @example
     * const pointJ1 = new JacobianPoint(null, null, null); // creates point at infinity
     * const pointJ2 = new JacobianPoint('3', '4', '1'); // creates point (3, 4, 1)
     */
    constructor(x, y, z) {
        super('jacobian');
        if (x === null && y === null && z === null) {
            this.x = this.curve.one;
            this.y = this.curve.one;
            this.z = new BigNumber(0);
        }
        else {
            if (!BigNumber.isBN(x)) {
                x = new BigNumber(x, 16);
            }
            this.x = x;
            if (!BigNumber.isBN(y)) {
                y = new BigNumber(y, 16);
            }
            this.y = y;
            if (!BigNumber.isBN(z)) {
                z = new BigNumber(z, 16);
            }
            this.z = z;
        }
        if (this.x.red == null) {
            this.x = this.x.toRed(this.curve.red);
        }
        if (this.y.red == null) {
            this.y = this.y.toRed(this.curve.red);
        }
        if (this.z.red == null) {
            this.z = this.z.toRed(this.curve.red);
        }
        this.zOne = this.z === this.curve.one;
    }
    /**
     * Converts the `JacobianPoint` object instance to standard affine `Point` format and returns `Point` type.
     *
     * @returns The `Point`(affine) object representing the same point as the original `JacobianPoint`.
     *
     * If the initial `JacobianPoint` represents point at infinity, an instance of `Point` at infinity is returned.
     *
     * @example
     * const pointJ = new JacobianPoint('3', '4', '1');
     * const pointP = pointJ.toP();  // The point in affine coordinates.
     */
    toP() {
        if (this.isInfinity()) {
            return new Point(null, null);
        }
        const zinv = this.z.redInvm();
        const zinv2 = zinv.redSqr();
        const ax = this.x.redMul(zinv2);
        const ay = this.y.redMul(zinv2).redMul(zinv);
        return new Point(ax, ay);
    }
    /**
     * Negation operation. It returns the additive inverse of the Jacobian point.
     *
     * @method neg
     * @returns Returns a new Jacobian point as the result of the negation.
     *
     * @example
     * const jp = new JacobianPoint(x, y, z)
     * const result = jp.neg()
     */
    neg() {
        return new JacobianPoint(this.x, this.y.redNeg(), this.z);
    }
    /**
     * Addition operation in the Jacobian coordinates. It takes a Jacobian point as an argument
     * and returns a new Jacobian point as a result of the addition. In the special cases,
     * when either one of the points is the point at infinity, it will return the other point.
     *
     * @method add
     * @param p - The Jacobian point to be added.
     * @returns Returns a new Jacobian point as the result of the addition.
     *
     * @example
     * const p1 = new JacobianPoint(x1, y1, z1)
     * const p2 = new JacobianPoint(x2, y2, z2)
     * const result = p1.add(p2)
     */
    add(p) {
        // O + P = P
        if (this.isInfinity()) {
            return p;
        }
        // P + O = P
        if (p.isInfinity()) {
            return this;
        }
        // 12M + 4S + 7A
        const pz2 = p.z.redSqr();
        const z2 = this.z.redSqr();
        const u1 = this.x.redMul(pz2);
        const u2 = p.x.redMul(z2);
        const s1 = this.y.redMul(pz2.redMul(p.z));
        const s2 = p.y.redMul(z2.redMul(this.z));
        const h = u1.redSub(u2);
        const r = s1.redSub(s2);
        if (h.cmpn(0) === 0) {
            if (r.cmpn(0) !== 0) {
                return new JacobianPoint(null, null, null);
            }
            else {
                return this.dbl();
            }
        }
        const h2 = h.redSqr();
        const h3 = h2.redMul(h);
        const v = u1.redMul(h2);
        const nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
        const ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
        const nz = this.z.redMul(p.z).redMul(h);
        return new JacobianPoint(nx, ny, nz);
    }
    /**
     * Mixed addition operation. This function combines the standard point addition with
     * the transformation from the affine to Jacobian coordinates. It first converts
     * the affine point to Jacobian, and then preforms the addition.
     *
     * @method mixedAdd
     * @param p - The affine point to be added.
     * @returns Returns the result of the mixed addition as a new Jacobian point.
     *
     * @example
     * const jp = new JacobianPoint(x1, y1, z1)
     * const ap = new Point(x2, y2)
     * const result = jp.mixedAdd(ap)
     */
    mixedAdd(p) {
        // O + P = P
        if (this.isInfinity()) {
            return p.toJ();
        }
        // P + O = P
        if (p.isInfinity()) {
            return this;
        }
        // 8M + 3S + 7A
        const z2 = this.z.redSqr();
        const u1 = this.x;
        const u2 = p.x.redMul(z2);
        const s1 = this.y;
        const s2 = p.y.redMul(z2).redMul(this.z);
        const h = u1.redSub(u2);
        const r = s1.redSub(s2);
        if (h.cmpn(0) === 0) {
            if (r.cmpn(0) !== 0) {
                return new JacobianPoint(null, null, null);
            }
            else {
                return this.dbl();
            }
        }
        const h2 = h.redSqr();
        const h3 = h2.redMul(h);
        const v = u1.redMul(h2);
        const nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
        const ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
        const nz = this.z.redMul(h);
        return new JacobianPoint(nx, ny, nz);
    }
    /**
     * Multiple doubling operation. It doubles the Jacobian point as many times as the pow parameter specifies. If pow is 0 or the point is the point at infinity, it will return the point itself.
     *
     * @method dblp
     * @param pow - The number of times the point should be doubled.
     * @returns Returns a new Jacobian point as the result of multiple doublings.
     *
     * @example
     * const jp = new JacobianPoint(x, y, z)
     * const result = jp.dblp(3)
     */
    dblp(pow) {
        if (pow === 0) {
            return this;
        }
        if (this.isInfinity()) {
            return this;
        }
        if (typeof pow === 'undefined') {
            return this.dbl();
        }
        /* eslint-disable @typescript-eslint/no-this-alias */
        let r = this;
        for (let i = 0; i < pow; i++) {
            r = r.dbl();
        }
        return r;
    }
    /**
     * Point doubling operation in the Jacobian coordinates. A special case is when the point is the point at infinity, in this case, this function will return the point itself.
     *
     * @method dbl
     * @returns Returns a new Jacobian point as the result of the doubling.
     *
     * @example
     * const jp = new JacobianPoint(x, y, z)
     * const result = jp.dbl()
     */
    dbl() {
        if (this.isInfinity()) {
            return this;
        }
        let nx;
        let ny;
        let nz;
        // Z = 1
        if (this.zOne) {
            // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
            //     #doubling-mdbl-2007-bl
            // 1M + 5S + 14A
            // XX = X1^2
            const xx = this.x.redSqr();
            // YY = Y1^2
            const yy = this.y.redSqr();
            // YYYY = YY^2
            const yyyy = yy.redSqr();
            // S = 2 * ((X1 + YY)^2 - XX - YYYY)
            let s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
            s = s.redIAdd(s);
            // M = 3 * XX + a; a = 0
            const m = xx.redAdd(xx).redIAdd(xx);
            // T = M ^ 2 - 2*S
            const t = m.redSqr().redISub(s).redISub(s);
            // 8 * YYYY
            let yyyy8 = yyyy.redIAdd(yyyy);
            yyyy8 = yyyy8.redIAdd(yyyy8);
            yyyy8 = yyyy8.redIAdd(yyyy8);
            // X3 = T
            nx = t;
            // Y3 = M * (S - T) - 8 * YYYY
            ny = m.redMul(s.redISub(t)).redISub(yyyy8);
            // Z3 = 2*Y1
            nz = this.y.redAdd(this.y);
        }
        else {
            // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
            //     #doubling-dbl-2009-l
            // 2M + 5S + 13A
            // A = X1^2
            const a = this.x.redSqr();
            // B = Y1^2
            const b = this.y.redSqr();
            // C = B^2
            const c = b.redSqr();
            // D = 2 * ((X1 + B)^2 - A - C)
            let d = this.x.redAdd(b).redSqr().redISub(a).redISub(c);
            d = d.redIAdd(d);
            // E = 3 * A
            const e = a.redAdd(a).redIAdd(a);
            // F = E^2
            const f = e.redSqr();
            // 8 * C
            let c8 = c.redIAdd(c);
            c8 = c8.redIAdd(c8);
            c8 = c8.redIAdd(c8);
            // X3 = F - 2 * D
            nx = f.redISub(d).redISub(d);
            // Y3 = E * (D - X3) - 8 * C
            ny = e.redMul(d.redISub(nx)).redISub(c8);
            // Z3 = 2 * Y1 * Z1
            nz = this.y.redMul(this.z);
            nz = nz.redIAdd(nz);
        }
        return new JacobianPoint(nx, ny, nz);
    }
    /**
     * Equality check operation. It checks whether the affine or Jacobian point is equal to this Jacobian point.
     *
     * @method eq
     * @param p - The affine or Jacobian point to compare with.
     * @returns Returns true if the points are equal, otherwise returns false.
     *
     * @example
     * const jp1 = new JacobianPoint(x1, y1, z1)
     * const jp2 = new JacobianPoint(x2, y2, z2)
     * const areEqual = jp1.eq(jp2)
     */
    eq(p) {
        if (p.type === 'affine') {
            return this.eq(p.toJ());
        }
        if (this === p) {
            return true;
        }
        // x1 * z2^2 == x2 * z1^2
        const z2 = this.z.redSqr();
        p = p;
        const pz2 = p.z.redSqr();
        if (this.x.redMul(pz2).redISub(p.x.redMul(z2)).cmpn(0) !== 0) {
            return false;
        }
        // y1 * z2^3 == y2 * z1^3
        const z3 = z2.redMul(this.z);
        const pz3 = pz2.redMul(p.z);
        return this.y.redMul(pz3).redISub(p.y.redMul(z3)).cmpn(0) === 0;
    }
    /**
     * Equality check operation in relation to an x coordinate of a point in projective coordinates.
     * It checks whether the x coordinate of the Jacobian point is equal to the provided x coordinate
     * of a point in projective coordinates.
     *
     * @method eqXToP
     * @param x - The x coordinate of a point in projective coordinates.
     * @returns Returns true if the x coordinates are equal, otherwise returns false.
     *
     * @example
     * const jp = new JacobianPoint(x1, y1, z1)
     * const isXEqual = jp.eqXToP(x2)
     */
    eqXToP(x) {
        const zs = this.z.redSqr();
        const rx = x.toRed(this.curve.red).redMul(zs);
        if (this.x.cmp(rx) === 0) {
            return true;
        }
        const xc = x.clone();
        const t = this.curve.redN.redMul(zs);
        for (;;) {
            xc.iadd(this.curve.n);
            if (xc.cmp(this.curve.p) >= 0) {
                return false;
            }
            rx.redIAdd(t);
            if (this.x.cmp(rx) === 0) {
                return true;
            }
        }
    }
    /**
     * Returns the string representation of the JacobianPoint instance.
     * @method inspect
     * @returns Returns the string description of the JacobianPoint. If the JacobianPoint represents a point at infinity, the return value of this function is '<EC JPoint Infinity>'. For a normal point, it returns the string description format as '<EC JPoint x: x-coordinate y: y-coordinate z: z-coordinate>'.
     *
     * @example
     * const point = new JacobianPoint('5', '6', '1');
     * console.log(point.inspect()); // Output: '<EC JPoint x: 5 y: 6 z: 1>'
     */
    inspect() {
        if (this.isInfinity()) {
            return '<EC JPoint Infinity>';
        }
        return '<EC JPoint x: ' + this.x.toString(16, 2) +
            ' y: ' + this.y.toString(16, 2) +
            ' z: ' + this.z.toString(16, 2) + '>';
    }
    /**
     * Checks whether the JacobianPoint instance represents a point at infinity.
     * @method isInfinity
     * @returns Returns true if the JacobianPoint's z-coordinate equals to zero (which represents the point at infinity in Jacobian coordinates). Returns false otherwise.
     *
     * @example
     * const point = new JacobianPoint('5', '6', '0');
     * console.log(point.isInfinity()); // Output: true
     */
    isInfinity() {
        return this.z.cmpn(0) === 0;
    }
}

const assert = (expression, message = 'Hash assertion failed') => {
    if (!expression) {
        throw new Error(message);
    }
};
/**
 * The BaseHash class is an abstract base class for cryptographic hash functions.
 * It provides a common structure and functionality for hash function classes.
 *
 * @class BaseHash
 *
 * @property pending - Stores partially processed message segments.
 * @property pendingTotal - The total number of characters that are being stored in `pending`
 * @property blockSize - The size of each block to processed.
 * @property outSize - The size of the final hash output.
 * @property endian - The endianness used during processing, can either be 'big' or 'little'.
 * @property _delta8 - The block size divided by 8, useful in various computations.
 * @property _delta32 - The block size divided by 32, useful in various computations.
 * @property padLength - The length of padding to be added to finalize the computation.
 * @property hmacStrength - The HMAC strength value.
 *
 * @param blockSize - The size of the block to be hashed.
 * @param outSize - The size of the resulting hash.
 * @param hmacStrength - The strength of the HMAC.
 * @param padLength - The length of the padding to be added.
 *
 * @example
 * Sub-classes would extend this base BaseHash class like:
 * class RIPEMD160 extends BaseHash {
 *   constructor () {
 *     super(512, 160, 192, 64);
 *     // ...
 *   }
 *   // ...
 * }
 */
class BaseHash {
    pending;
    pendingTotal;
    blockSize;
    outSize;
    endian;
    _delta8;
    _delta32;
    padLength;
    hmacStrength;
    constructor(blockSize, outSize, hmacStrength, padLength) {
        this.pending = null;
        this.pendingTotal = 0;
        this.blockSize = blockSize;
        this.outSize = outSize;
        this.hmacStrength = hmacStrength;
        this.padLength = padLength / 8;
        this.endian = 'big';
        this._delta8 = this.blockSize / 8;
        this._delta32 = this.blockSize / 32;
    }
    _update(msg, start) {
        throw new Error('Not implemented');
    }
    _digest() {
        throw new Error('Not implemented');
    }
    _digestHex() {
        throw new Error('Not implemented');
    }
    /**
     * Converts the input message into an array, pads it, and joins into 32bit blocks.
     * If there is enough data, it tries updating the hash computation.
     *
     * @method update
     * @param msg - The message segment to include in the hashing computation.
     * @param enc - The encoding of the message. If 'hex', the string will be treated as such, 'utf8' otherwise.
     *
     * @returns Returns the instance of the object for chaining.
     *
     * @example
     * sha256.update('Hello World', 'utf8');
     */
    update(msg, enc) {
        // Convert message to array, pad it, and join into 32bit blocks
        msg = toArray$1(msg, enc);
        if (this.pending == null) {
            this.pending = msg;
        }
        else {
            this.pending = this.pending.concat(msg);
        }
        this.pendingTotal += msg.length;
        // Enough data, try updating
        if (this.pending.length >= this._delta8) {
            msg = this.pending;
            // Process pending data in blocks
            const r = msg.length % this._delta8;
            this.pending = msg.slice(msg.length - r, msg.length);
            if (this.pending.length === 0) {
                this.pending = null;
            }
            msg = join32(msg, 0, msg.length - r, this.endian);
            for (let i = 0; i < msg.length; i += this._delta32) {
                this._update(msg, i);
            }
        }
        return this;
    }
    /**
     * Finalizes the hash computation and returns the hash value/result.
     *
     * @method digest
     *
     * @returns Returns the final hash value.
     *
     * @example
     * const hash = sha256.digest();
     */
    digest() {
        this.update(this._pad());
        assert(this.pending === null);
        return this._digest();
    }
    ;
    /**
     * Finalizes the hash computation and returns the hash value/result as a hex string.
     *
     * @method digest
     *
     * @returns Returns the final hash value as a hex string.
     *
     * @example
     * const hash = sha256.digestHex();
     */
    digestHex() {
        this.update(this._pad());
        assert(this.pending === null);
        return this._digestHex();
    }
    ;
    /**
     * [Private Method] Used internally to prepare the padding for the final stage of the hash computation.
     *
     * @method _pad
     * @private
     *
     * @returns Returns an array denoting the padding.
     */
    _pad() {
        let len = this.pendingTotal;
        const bytes = this._delta8;
        const k = bytes - ((len + this.padLength) % bytes);
        const res = new Array(k + this.padLength);
        res[0] = 0x80;
        let i;
        for (i = 1; i < k; i++) {
            res[i] = 0;
        }
        // Append length
        len <<= 3;
        let t;
        if (this.endian === 'big') {
            for (t = 8; t < this.padLength; t++) {
                res[i++] = 0;
            }
            res[i++] = 0;
            res[i++] = 0;
            res[i++] = 0;
            res[i++] = 0;
            res[i++] = (len >>> 24) & 0xff;
            res[i++] = (len >>> 16) & 0xff;
            res[i++] = (len >>> 8) & 0xff;
            res[i++] = len & 0xff;
        }
        else {
            res[i++] = len & 0xff;
            res[i++] = (len >>> 8) & 0xff;
            res[i++] = (len >>> 16) & 0xff;
            res[i++] = (len >>> 24) & 0xff;
            res[i++] = 0;
            res[i++] = 0;
            res[i++] = 0;
            res[i++] = 0;
            for (t = 8; t < this.padLength; t++) {
                res[i++] = 0;
            }
        }
        return res;
    }
}
function isSurrogatePair(msg, i) {
    if ((msg.charCodeAt(i) & 0xFC00) !== 0xD800) {
        return false;
    }
    if (i < 0 || i + 1 >= msg.length) {
        return false;
    }
    return (msg.charCodeAt(i + 1) & 0xFC00) === 0xDC00;
}
/**
 *
 * @param msg
 * @param enc Optional. Encoding to use if msg is string. Default is 'utf8'.
 * @returns array of byte values from msg. If msg is an array, a copy is returned.
 */
function toArray$1(msg, enc) {
    if (Array.isArray(msg)) {
        return msg.slice();
    }
    if (!msg) {
        return [];
    }
    const res = [];
    if (typeof msg === 'string') {
        if (enc !== 'hex') {
            // Inspired by stringToUtf8ByteArray() in closure-library by Google
            // https://github.com/google/closure-library/blob/8598d87242af59aac233270742c8984e2b2bdbe0/closure/goog/crypt/crypt.js#L117-L143
            // Apache License 2.0
            // https://github.com/google/closure-library/blob/master/LICENSE
            let p = 0;
            for (let i = 0; i < msg.length; i++) {
                let c = msg.charCodeAt(i);
                if (c < 128) {
                    res[p++] = c;
                }
                else if (c < 2048) {
                    res[p++] = (c >> 6) | 192;
                    res[p++] = (c & 63) | 128;
                }
                else if (isSurrogatePair(msg, i)) {
                    c = 0x10000 + ((c & 0x03FF) << 10) + (msg.charCodeAt(++i) & 0x03FF);
                    res[p++] = (c >> 18) | 240;
                    res[p++] = ((c >> 12) & 63) | 128;
                    res[p++] = ((c >> 6) & 63) | 128;
                    res[p++] = (c & 63) | 128;
                }
                else {
                    res[p++] = (c >> 12) | 224;
                    res[p++] = ((c >> 6) & 63) | 128;
                    res[p++] = (c & 63) | 128;
                }
            }
        }
        else {
            msg = msg.replace(/[^a-z0-9]+/ig, '');
            if (msg.length % 2 !== 0) {
                msg = '0' + msg;
            }
            for (let i = 0; i < msg.length; i += 2) {
                res.push(parseInt(msg[i] + msg[i + 1], 16));
            }
        }
    }
    else {
        msg = msg;
        for (let i = 0; i < msg.length; i++) {
            res[i] = msg[i] | 0;
        }
    }
    return res;
}
function htonl(w) {
    const res = (w >>> 24) |
        ((w >>> 8) & 0xff00) |
        ((w << 8) & 0xff0000) |
        ((w & 0xff) << 24);
    return res >>> 0;
}
function toHex32(msg, endian) {
    let res = '';
    for (let i = 0; i < msg.length; i++) {
        let w = msg[i];
        if (endian === 'little') {
            w = htonl(w);
        }
        res += zero8(w.toString(16));
    }
    return res;
}
function zero8(word) {
    if (word.length === 7) {
        return '0' + word;
    }
    else if (word.length === 6) {
        return '00' + word;
    }
    else if (word.length === 5) {
        return '000' + word;
    }
    else if (word.length === 4) {
        return '0000' + word;
    }
    else if (word.length === 3) {
        return '00000' + word;
    }
    else if (word.length === 2) {
        return '000000' + word;
    }
    else if (word.length === 1) {
        return '0000000' + word;
    }
    else {
        return word;
    }
}
function join32(msg, start, end, endian) {
    const len = end - start;
    assert(len % 4 === 0);
    const res = new Array(len / 4);
    for (let i = 0, k = start; i < res.length; i++, k += 4) {
        let w;
        if (endian === 'big') {
            w = (msg[k] << 24) | (msg[k + 1] << 16) | (msg[k + 2] << 8) | msg[k + 3];
        }
        else {
            w = (msg[k + 3] << 24) | (msg[k + 2] << 16) | (msg[k + 1] << 8) | msg[k];
        }
        res[i] = w >>> 0;
    }
    return res;
}
function split32(msg, endian) {
    const res = new Array(msg.length * 4);
    for (let i = 0, k = 0; i < msg.length; i++, k += 4) {
        const m = msg[i];
        if (endian === 'big') {
            res[k] = m >>> 24;
            res[k + 1] = (m >>> 16) & 0xff;
            res[k + 2] = (m >>> 8) & 0xff;
            res[k + 3] = m & 0xff;
        }
        else {
            res[k + 3] = m >>> 24;
            res[k + 2] = (m >>> 16) & 0xff;
            res[k + 1] = (m >>> 8) & 0xff;
            res[k] = m & 0xff;
        }
    }
    return res;
}
function rotr32(w, b) {
    return (w >>> b) | (w << (32 - b));
}
function rotl32(w, b) {
    return (w << b) | (w >>> (32 - b));
}
function sum32(a, b) {
    return (a + b) >>> 0;
}
function SUM32_3(a, b, c) {
    return (a + b + c) >>> 0;
}
function SUM32_4(a, b, c, d) {
    return (a + b + c + d) >>> 0;
}
function SUM32_5(a, b, c, d, e) {
    return (a + b + c + d + e) >>> 0;
}
function FT_1(s, x, y, z) {
    if (s === 0) {
        return ch32(x, y, z);
    }
    if (s === 1 || s === 3) {
        return p32(x, y, z);
    }
    if (s === 2) {
        return maj32(x, y, z);
    }
}
function ch32(x, y, z) {
    return (x & y) ^ ((~x) & z);
}
function maj32(x, y, z) {
    return (x & y) ^ (x & z) ^ (y & z);
}
function p32(x, y, z) {
    return x ^ y ^ z;
}
function S0_256(x) {
    return rotr32(x, 2) ^ rotr32(x, 13) ^ rotr32(x, 22);
}
function S1_256(x) {
    return rotr32(x, 6) ^ rotr32(x, 11) ^ rotr32(x, 25);
}
function G0_256(x) {
    return rotr32(x, 7) ^ rotr32(x, 18) ^ (x >>> 3);
}
function G1_256(x) {
    return rotr32(x, 17) ^ rotr32(x, 19) ^ (x >>> 10);
}
const r$1 = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
    3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
    1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
    4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
];
const rh = [
    5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
    6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
    15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
    8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
    12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
];
const s = [
    11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
    7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
    11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
    11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
    9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
];
const sh = [
    8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
    9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
    9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
    15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
    8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
];
function f$1(j, x, y, z) {
    if (j <= 15) {
        return x ^ y ^ z;
    }
    else if (j <= 31) {
        return (x & y) | ((~x) & z);
    }
    else if (j <= 47) {
        return (x | (~y)) ^ z;
    }
    else if (j <= 63) {
        return (x & z) | (y & (~z));
    }
    else {
        return x ^ (y | (~z));
    }
}
function K$1(j) {
    if (j <= 15) {
        return 0x00000000;
    }
    else if (j <= 31) {
        return 0x5a827999;
    }
    else if (j <= 47) {
        return 0x6ed9eba1;
    }
    else if (j <= 63) {
        return 0x8f1bbcdc;
    }
    else {
        return 0xa953fd4e;
    }
}
function Kh(j) {
    if (j <= 15) {
        return 0x50a28be6;
    }
    else if (j <= 31) {
        return 0x5c4dd124;
    }
    else if (j <= 47) {
        return 0x6d703ef3;
    }
    else if (j <= 63) {
        return 0x7a6d76e9;
    }
    else {
        return 0x00000000;
    }
}
/**
 * An implementation of RIPEMD160 cryptographic hash function. Extends the BaseHash class.
 * It provides a way to compute a 'digest' for any kind of input data; transforming the data
 * into a unique output of fixed size. The output is deterministic; it will always be
 * the same for the same input.
 *
 * @class RIPEMD160
 * @param None
 *
 * @constructor
 * Use the RIPEMD160 constructor to create an instance of RIPEMD160 hash function.
 *
 * @example
 * const ripemd160 = new RIPEMD160();
 *
 * @property h - Array that is updated iteratively as part of hashing computation.
 */
class RIPEMD160 extends BaseHash {
    h;
    constructor() {
        super(512, 160, 192, 64);
        this.endian = 'little';
        this.h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
        this.endian = 'little';
    }
    _update(msg, start) {
        let A = this.h[0];
        let B = this.h[1];
        let C = this.h[2];
        let D = this.h[3];
        let E = this.h[4];
        let Ah = A;
        let Bh = B;
        let Ch = C;
        let Dh = D;
        let Eh = E;
        let T;
        for (let j = 0; j < 80; j++) {
            T = sum32(rotl32(SUM32_4(A, f$1(j, B, C, D), msg[r$1[j] + start], K$1(j)), s[j]), E);
            A = E;
            E = D;
            D = rotl32(C, 10);
            C = B;
            B = T;
            T = sum32(rotl32(SUM32_4(Ah, f$1(79 - j, Bh, Ch, Dh), msg[rh[j] + start], Kh(j)), sh[j]), Eh);
            Ah = Eh;
            Eh = Dh;
            Dh = rotl32(Ch, 10);
            Ch = Bh;
            Bh = T;
        }
        T = SUM32_3(this.h[1], C, Dh);
        this.h[1] = SUM32_3(this.h[2], D, Eh);
        this.h[2] = SUM32_3(this.h[3], E, Ah);
        this.h[3] = SUM32_3(this.h[4], A, Bh);
        this.h[4] = SUM32_3(this.h[0], B, Ch);
        this.h[0] = T;
    }
    _digest() {
        return split32(this.h, 'little');
    }
    _digestHex() {
        return toHex32(this.h, 'little');
    }
}
/**
 * An implementation of SHA256 cryptographic hash function. Extends the BaseHash class.
 * It provides a way to compute a 'digest' for any kind of input data; transforming the data
 * into a unique output of fixed size. The output is deterministic; it will always be
 * the same for the same input.
 *
 * @class SHA256
 * @param None
 *
 * @constructor
 * Use the SHA256 constructor to create an instance of SHA256 hash function.
 *
 * @example
 * const sha256 = new SHA256();
 *
 * @property h - The initial hash constants
 * @property W - Provides a way to recycle usage of the array memory.
 * @property k - The round constants used for each round of SHA-256
 */
class SHA256 extends BaseHash {
    h;
    W;
    k;
    constructor() {
        super(512, 256, 192, 64);
        this.h = [
            0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
            0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
        ];
        this.k = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
            0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
            0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
            0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
            0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
            0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
            0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
            0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
            0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];
        this.W = new Array(64);
    }
    _update(msg, start) {
        const W = this.W;
        let i;
        for (i = 0; i < 16; i++) {
            W[i] = msg[start + i];
        }
        for (; i < W.length; i++) {
            W[i] = SUM32_4(G1_256(W[i - 2]), W[i - 7], G0_256(W[i - 15]), W[i - 16]);
        }
        let a = this.h[0];
        let b = this.h[1];
        let c = this.h[2];
        let d = this.h[3];
        let e = this.h[4];
        let f = this.h[5];
        let g = this.h[6];
        let h = this.h[7];
        assert(this.k.length === W.length);
        for (i = 0; i < W.length; i++) {
            const T1 = SUM32_5(h, S1_256(e), ch32(e, f, g), this.k[i], W[i]);
            const T2 = sum32(S0_256(a), maj32(a, b, c));
            h = g;
            g = f;
            f = e;
            e = sum32(d, T1);
            d = c;
            c = b;
            b = a;
            a = sum32(T1, T2);
        }
        this.h[0] = sum32(this.h[0], a);
        this.h[1] = sum32(this.h[1], b);
        this.h[2] = sum32(this.h[2], c);
        this.h[3] = sum32(this.h[3], d);
        this.h[4] = sum32(this.h[4], e);
        this.h[5] = sum32(this.h[5], f);
        this.h[6] = sum32(this.h[6], g);
        this.h[7] = sum32(this.h[7], h);
    }
    ;
    _digest() {
        return split32(this.h, 'big');
    }
    _digestHex() {
        return toHex32(this.h, 'big');
    }
}
/**
 * An implementation of SHA1 cryptographic hash function. Extends the BaseHash class.
 * It provides a way to compute a 'digest' for any kind of input data; transforming the data
 * into a unique output of fixed size. The output is deterministic; it will always be
 * the same for the same input.
 *
 * @class SHA1
 * @param None
 *
 * @constructor
 * Use the SHA1 constructor to create an instance of SHA1 hash function.
 *
 * @example
 * const sha1 = new SHA1();
 *
 * @property h - The initial hash constants.
 * @property W - Provides a way to recycle usage of the array memory.
 * @property k - The round constants used for each round of SHA-1.
 */
class SHA1 extends BaseHash {
    h;
    W;
    k;
    constructor() {
        super(512, 160, 80, 64);
        this.k = [
            0x5A827999, 0x6ED9EBA1,
            0x8F1BBCDC, 0xCA62C1D6
        ];
        this.h = [
            0x67452301, 0xefcdab89, 0x98badcfe,
            0x10325476, 0xc3d2e1f0
        ];
        this.W = new Array(80);
    }
    _update(msg, start) {
        const W = this.W;
        let i;
        for (i = 0; i < 16; i++) {
            W[i] = msg[start + i];
        }
        for (; i < W.length; i++) {
            W[i] = rotl32(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
        }
        let a = this.h[0];
        let b = this.h[1];
        let c = this.h[2];
        let d = this.h[3];
        let e = this.h[4];
        for (i = 0; i < W.length; i++) {
            const s = ~~(i / 20);
            const t = SUM32_5(rotl32(a, 5), FT_1(s, b, c, d), e, W[i], this.k[s]);
            e = d;
            d = c;
            c = rotl32(b, 30);
            b = a;
            a = t;
        }
        this.h[0] = sum32(this.h[0], a);
        this.h[1] = sum32(this.h[1], b);
        this.h[2] = sum32(this.h[2], c);
        this.h[3] = sum32(this.h[3], d);
        this.h[4] = sum32(this.h[4], e);
    }
    _digest() {
        return split32(this.h, 'big');
    }
    _digestHex() {
        return toHex32(this.h, 'big');
    }
}
/**
 * The `SHA256HMAC` class is used to create Hash-based Message Authentication Code (HMAC) using the SHA-256 cryptographic hash function.
 *
 * HMAC is a specific type of MAC involving a cryptographic hash function and a secret cryptographic key. It may be used to simultaneously verify both the data integrity and the authenticity of a message.
 *
 * This class also uses the SHA-256 cryptographic hash algorithm that produces a 256-bit (32-byte) hash value.
 *
 * @property inner - Represents the inner hash of SHA-256.
 * @property outer - Represents the outer hash of SHA-256.
 * @property blockSize - The block size for the SHA-256 hash function, in bytes. It's set to 64 bytes.
 * @property outSize - The output size of the SHA-256 hash function, in bytes. It's set to 32 bytes.
 */
class SHA256HMAC {
    inner;
    outer;
    blockSize = 64;
    outSize = 32;
    /**
     * The constructor for the `SHA256HMAC` class.
     *
     * It initializes the `SHA256HMAC` object and sets up the inner and outer padded keys.
     * If the key size is larger than the blockSize, it is digested using SHA-256.
     * If the key size is less than the blockSize, it is padded with zeroes.
     *
     * @constructor
     * @param key - The key to use to create the HMAC. Can be a number array or a string in hexadecimal format.
     *
     * @example
     * const myHMAC = new SHA256HMAC('deadbeef');
     */
    constructor(key) {
        key = toArray$1(key, 'hex');
        // Shorten key, if needed
        if (key.length > this.blockSize) {
            key = new SHA256().update(key).digest();
        }
        assert(key.length <= this.blockSize);
        // Add padding to key
        let i;
        for (i = key.length; i < this.blockSize; i++) {
            key.push(0);
        }
        for (i = 0; i < key.length; i++) {
            key[i] ^= 0x36;
        }
        this.inner = new SHA256().update(key);
        // 0x36 ^ 0x5c = 0x6a
        for (i = 0; i < key.length; i++) {
            key[i] ^= 0x6a;
        }
        this.outer = new SHA256().update(key);
    }
    /**
     * Updates the `SHA256HMAC` object with part of the message to be hashed.
     *
     * @method update
     * @param msg - Part of the message to hash. Can be a number array or a string.
     * @param enc - If 'hex', then the input is encoded as hexadecimal. If undefined or not 'hex', then no encoding is performed.
     * @returns Returns the instance of `SHA256HMAC` for chaining calls.
     *
     * @example
     * myHMAC.update('deadbeef', 'hex');
     */
    update(msg, enc) {
        this.inner.update(msg, enc);
        return this;
    }
    /**
     * Finalizes the HMAC computation and returns the resultant hash.
     *
     * @method digest
     * @returns Returns the digest of the hashed data. Can be a number array or a string.
     *
     * @example
     * let hashedMessage = myHMAC.digest();
     */
    digest() {
        this.outer.update(this.inner.digest());
        return this.outer.digest();
    }
    /**
     * Finalizes the HMAC computation and returns the resultant hash as a hex string.
     *
     * @method digest
     * @returns Returns the digest of the hashed data as a hex string
     *
     * @example
     * let hashedMessage = myHMAC.digestHex();
     */
    digestHex() {
        this.outer.update(this.inner.digest());
        return this.outer.digestHex();
    }
}
/**
 * Computes RIPEMD160 hash of a given message.
 * @function ripemd160
 * @param msg - The message to compute the hash for.
 * @param enc - The encoding of msg if string. Default is 'utf8'.
 *
 * @returns the computed RIPEMD160 hash of the message.
 *
 * @example
 * const digest = ripemd160('Hello, world!');
 */
const ripemd160 = (msg, enc) => {
    return new RIPEMD160().update(msg, enc).digest();
};
/**
 * Computes SHA1 hash of a given message.
 * @function sha1
 * @param msg - The message to compute the hash for.
 * @param enc - The encoding of msg if string. Default is 'utf8'.
 *
 * @returns the computed SHA1 hash of the message.
 *
 * @example
 * const digest = sha1('Hello, world!');
 */
const sha1 = (msg, enc) => {
    return new SHA1().update(msg, enc).digest();
};
/**
 * Computes SHA256 hash of a given message.
 * @function sha256
 * @param msg - The message to compute the hash for.
 * @param enc - The encoding of msg if string. Default is 'utf8'.
 *
 * @returns the computed SHA256 hash of the message.
 *
 * @example
 * const digest = sha256('Hello, world!');
 */
const sha256 = (msg, enc) => {
    return new SHA256().update(msg, enc).digest();
};
/**
 * Performs a 'double hash' using SHA256. This means the data is hashed twice
 * with SHA256. First, the SHA256 hash of the message is computed, then the
 * SHA256 hash of the resulting hash is computed.
 * @function hash256
 * @param msg - The message to compute the hash for.
 * @param enc - The encoding of msg if string. Default is 'utf8'.
 *
 * @returns the double hashed SHA256 output.
 *
 * @example
 * const doubleHash = hash256('Hello, world!');
 */
const hash256 = (msg, enc) => {
    const first = new SHA256().update(msg, enc).digest();
    return new SHA256().update(first).digest();
};
/**
 * Computes SHA256 hash of a given message and then computes a RIPEMD160 hash of the result.
 *
 * @function hash160
 * @param msg - The message to compute the hash for.
 * @param enc - The encoding of msg if string. Default is 'utf8'.
 *
 * @returns the RIPEMD160 hash of the SHA256 hash of the input message.
 *
 * @example
 * const hash = hash160('Hello, world!');
 */
const hash160 = (msg, enc) => {
    const first = new SHA256().update(msg, enc).digest();
    return new RIPEMD160().update(first).digest();
};
/**
 * Computes SHA256 HMAC of a given message with a given key.
 * @function sha256hmac
 * @param key - The key used to compute the HMAC
 * @param msg - The message to compute the hash for.
 * @param enc - The encoding of msg if string. Default is 'utf8'.
 *
 * @returns the computed HMAC of the message.
 *
 * @example
 * const digest = sha256hmac('deadbeef', 'ffff001d');
 */
const sha256hmac = (key, msg, enc) => {
    return new SHA256HMAC(key).update(msg, enc).digest();
};

/**
 * Prepends a '0' to an odd character length word to ensure it has an even number of characters.
 * @param {string} word - The input word.
 * @returns {string} - The word with a leading '0' if it's an odd character length; otherwise, the original word.
 */
const zero2 = (word) => {
    if (word.length % 2 === 1) {
        return '0' + word;
    }
    else {
        return word;
    }
};
/**
 * Converts an array of numbers to a hexadecimal string representation.
 * @param {number[]} msg - The input array of numbers.
 * @returns {string} - The hexadecimal string representation of the input array.
 */
const toHex = (msg) => {
    let res = '';
    for (let i = 0; i < msg.length; i++) {
        res += zero2(msg[i].toString(16));
    }
    return res;
};
/**
 * Converts various message formats into an array of numbers.
 * Supports arrays, hexadecimal strings, base64 strings, and UTF-8 strings.
 *
 * @param {any} msg - The input message (array or string).
 * @param {('hex' | 'utf8' | 'base64')} enc - Specifies the string encoding, if applicable.
 * @returns {any[]} - Array representation of the input.
 */
const toArray = (msg, enc) => {
    // Return a copy if already an array
    if (Array.isArray(msg)) {
        return msg.slice();
    }
    // Return empty array for falsy values
    if (!msg) {
        return [];
    }
    const res = [];
    // Convert non-string messages to numbers
    if (typeof msg !== 'string') {
        for (let i = 0; i < msg.length; i++) {
            res[i] = msg[i] | 0;
        }
        return res;
    }
    // Handle hexadecimal encoding
    if (enc === 'hex') {
        msg = msg.replace(/[^a-z0-9]+/ig, '');
        if (msg.length % 2 !== 0) {
            msg = '0' + msg;
        }
        for (let i = 0; i < msg.length; i += 2) {
            res.push(parseInt(msg[i] + msg[i + 1], 16));
        }
        // Handle base64
    }
    else if (enc === 'base64') {
        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const result = [];
        let currentBit = 0;
        let currentByte = 0;
        for (const char of msg.replace(/=+$/, '')) {
            currentBit = (currentBit << 6) | base64Chars.indexOf(char);
            currentByte += 6;
            if (currentByte >= 8) {
                currentByte -= 8;
                result.push((currentBit >> currentByte) & 0xFF);
                currentBit &= (1 << currentByte) - 1;
            }
        }
        return result;
    }
    else {
        // Handle UTF-8 encoding
        for (let i = 0; i < msg.length; i++) {
            const c = msg.charCodeAt(i);
            const hi = c >> 8;
            const lo = c & 0xff;
            if (hi) {
                res.push(hi, lo);
            }
            else {
                res.push(lo);
            }
        }
    }
    return res;
};
/**
 * Converts an array of numbers to a UTF-8 encoded string.
 * @param {number[]} arr - The input array of numbers.
 * @returns {string} - The UTF-8 encoded string.
 */
const toUTF8 = (arr) => {
    let result = '';
    for (let i = 0; i < arr.length; i++) {
        const byte = arr[i];
        // 1-byte sequence (0xxxxxxx)
        if (byte <= 0x7F) {
            result += String.fromCharCode(byte);
        }
        // 2-byte sequence (110xxxxx 10xxxxxx)
        else if (byte >= 0xC0 && byte <= 0xDF) {
            const byte2 = arr[++i];
            const codePoint = ((byte & 0x1F) << 6) | (byte2 & 0x3F);
            result += String.fromCharCode(codePoint);
        }
        // 3-byte sequence (1110xxxx 10xxxxxx 10xxxxxx)
        else if (byte >= 0xE0 && byte <= 0xEF) {
            const byte2 = arr[++i];
            const byte3 = arr[++i];
            const codePoint = ((byte & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
            result += String.fromCharCode(codePoint);
        }
        // 4-byte sequence (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
        else if (byte >= 0xF0 && byte <= 0xF7) {
            const byte2 = arr[++i];
            const byte3 = arr[++i];
            const byte4 = arr[++i];
            const codePoint = ((byte & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
            // Convert to UTF-16 surrogate pair
            const surrogate1 = 0xD800 + ((codePoint - 0x10000) >> 10);
            const surrogate2 = 0xDC00 + ((codePoint - 0x10000) & 0x3FF);
            result += String.fromCharCode(surrogate1, surrogate2);
        }
    }
    return result;
};
/**
 * Encodes an array of numbers into a specified encoding ('hex' or 'utf8'). If no encoding is provided, returns the original array.
 * @param {number[]} arr - The input array of numbers.
 * @param {('hex' | 'utf8')} enc - The desired encoding.
 * @returns {string | number[]} - The encoded message as a string (for 'hex' and 'utf8') or the original array.
 */
const encode = (arr, enc) => {
    switch (enc) {
        case 'hex':
            return toHex(arr);
        case 'utf8':
            return toUTF8(arr);
        // If no encoding is provided, return the original array
        default:
            return arr;
    }
};
/**
 * Converts an array of bytes (each between 0 and 255) into a base64 encoded string.
 *
 * @param {number[]} byteArray - An array of numbers where each number is a byte (0-255).
 * @returns {string} The base64 encoded string.
 *
 * @example
 * const bytes = [72, 101, 108, 108, 111]; // Represents the string "Hello"
 * console.log(toBase64(bytes)); // Outputs: SGVsbG8=
 */
function toBase64(byteArray) {
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i;
    for (i = 0; i < byteArray.length; i += 3) {
        const byte1 = byteArray[i];
        const byte2 = i + 1 < byteArray.length ? byteArray[i + 1] : 0;
        const byte3 = i + 2 < byteArray.length ? byteArray[i + 2] : 0;
        const encoded1 = byte1 >> 2;
        const encoded2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
        const encoded3 = ((byte2 & 0x0F) << 2) | (byte3 >> 6);
        const encoded4 = byte3 & 0x3F;
        result += base64Chars.charAt(encoded1) + base64Chars.charAt(encoded2);
        result += i + 1 < byteArray.length ? base64Chars.charAt(encoded3) : '=';
        result += i + 2 < byteArray.length ? base64Chars.charAt(encoded4) : '=';
    }
    return result;
}
const base58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
/**
 * Converts a string from base58 to a binary array
 * @param str - The string representation
 * @returns The binary representation
 */
const fromBase58 = (str) => {
    if (!str || typeof str !== 'string') {
        throw new Error(`Expected base58 string but got “${str}”`);
    }
    if (str.match(/[IOl0]/gmu)) {
        throw new Error(`Invalid base58 character “${str.match(/[IOl0]/gmu)}”`);
    }
    const lz = str.match(/^1+/gmu);
    const psz = lz ? lz[0].length : 0;
    const size = ((str.length - psz) * (Math.log(58) / Math.log(256)) + 1) >>> 0;
    const uint8 = new Uint8Array([
        ...new Uint8Array(psz),
        ...str
            .match(/.{1}/gmu)
            .map((i) => base58chars.indexOf(i))
            .reduce((acc, i) => {
            acc = acc.map((j) => {
                const x = j * 58 + i;
                i = x >> 8;
                return x;
            });
            return acc;
        }, new Uint8Array(size))
            .reverse()
            .filter(((lastValue) => (value) => 
        // @ts-expect-error
        (lastValue = lastValue || value))(false))
    ]);
    return [...uint8];
};
/**
 * Converts a binary array into a base58 string
 * @param bin - The binary array to convert to base58
 * @returns The base58 string representation
 */
const toBase58 = (bin) => {
    const base58Map = Array(256).fill(-1);
    for (let i = 0; i < base58chars.length; ++i) {
        base58Map[base58chars.charCodeAt(i)] = i;
    }
    const result = [];
    for (const byte of bin) {
        let carry = byte;
        for (let j = 0; j < result.length; ++j) {
            const x = (base58Map[result[j]] << 8) + carry;
            result[j] = base58chars.charCodeAt(x % 58);
            carry = (x / 58) | 0;
        }
        while (carry) {
            result.push(base58chars.charCodeAt(carry % 58));
            carry = (carry / 58) | 0;
        }
    }
    for (const byte of bin) {
        if (byte)
            break;
        else
            result.push('1'.charCodeAt(0));
    }
    result.reverse();
    return String.fromCharCode(...result);
};
/**
 * Converts a binary array into a base58check string with a checksum
 * @param bin - The binary array to convert to base58check
 * @returns The base58check string representation
 */
const toBase58Check = (bin, prefix = [0]) => {
    let hash = hash256([...prefix, ...bin]);
    hash = [...prefix, ...bin, ...hash.slice(0, 4)];
    return toBase58(hash);
};
/**
 * Converts a base58check string into a binary array after validating the checksum
 * @param str - The base58check string to convert to binary
 * @param enc - If hex, the return values will be hex strings, arrays of numbers otherwise
 * @param prefixLength - The length of the prefix. Optional, defaults to 1.
 * @returns The binary array representation
 */
const fromBase58Check = (str, enc, prefixLength = 1) => {
    const bin = fromBase58(str);
    let prefix = bin.slice(0, prefixLength);
    let data = bin.slice(prefixLength, -4);
    let hash = [...prefix, ...data];
    hash = hash256(hash);
    bin.slice(-4).forEach((check, index) => {
        if (check !== hash[index]) {
            throw new Error('Invalid checksum');
        }
    });
    if (enc === 'hex') {
        prefix = toHex(prefix);
        data = toHex(data);
    }
    return { prefix, data };
};
class Writer {
    bufs;
    constructor(bufs) {
        this.bufs = bufs || [];
    }
    getLength() {
        let len = 0;
        for (const buf of this.bufs) {
            len = len + buf.length;
        }
        return len;
    }
    toArray() {
        const totalLength = this.getLength();
        const ret = new Array(totalLength);
        let offset = 0;
        for (const buf of this.bufs) {
            for (let i = 0; i < buf.length; i++) {
                ret[offset++] = buf[i];
            }
        }
        return ret;
    }
    write(buf) {
        this.bufs.push(buf);
        return this;
    }
    writeReverse(buf) {
        const buf2 = new Array(buf.length);
        for (let i = 0; i < buf2.length; i++) {
            buf2[i] = buf[buf.length - 1 - i];
        }
        this.bufs.push(buf2);
        return this;
    }
    writeUInt8(n) {
        const buf = new Array(1);
        buf[0] = n;
        this.write(buf);
        return this;
    }
    writeInt8(n) {
        const buf = new Array(1);
        buf[0] = n & 0xFF;
        this.write(buf);
        return this;
    }
    writeUInt16BE(n) {
        this.bufs.push([
            (n >> 8) & 0xFF, // shift right 8 bits to get the high byte
            n & 0xFF // low byte is just the last 8 bits
        ]);
        return this;
    }
    writeInt16BE(n) {
        return this.writeUInt16BE(n & 0xFFFF); // Mask with 0xFFFF to get the lower 16 bits
    }
    writeUInt16LE(n) {
        this.bufs.push([
            n & 0xFF, // low byte is just the last 8 bits
            (n >> 8) & 0xFF // shift right 8 bits to get the high byte
        ]);
        return this;
    }
    writeInt16LE(n) {
        return this.writeUInt16LE(n & 0xFFFF); // Mask with 0xFFFF to get the lower 16 bits
    }
    writeUInt32BE(n) {
        this.bufs.push([
            (n >> 24) & 0xFF, // highest byte
            (n >> 16) & 0xFF,
            (n >> 8) & 0xFF,
            n & 0xFF // lowest byte
        ]);
        return this;
    }
    writeInt32BE(n) {
        return this.writeUInt32BE(n >>> 0); // Using unsigned right shift to handle negative numbers
    }
    writeUInt32LE(n) {
        this.bufs.push([
            n & 0xFF, // lowest byte
            (n >> 8) & 0xFF,
            (n >> 16) & 0xFF,
            (n >> 24) & 0xFF // highest byte
        ]);
        return this;
    }
    writeInt32LE(n) {
        return this.writeUInt32LE(n >>> 0); // Using unsigned right shift to handle negative numbers
    }
    writeUInt64BEBn(bn) {
        const buf = bn.toArray('be', 8);
        this.write(buf);
        return this;
    }
    writeUInt64LEBn(bn) {
        const buf = bn.toArray('be', 8);
        this.writeReverse(buf);
        return this;
    }
    writeUInt64LE(n) {
        const buf = new BigNumber(n).toArray('be', 8);
        this.writeReverse(buf);
        return this;
    }
    writeVarIntNum(n) {
        const buf = Writer.varIntNum(n);
        this.write(buf);
        return this;
    }
    writeVarIntBn(bn) {
        const buf = Writer.varIntBn(bn);
        this.write(buf);
        return this;
    }
    static varIntNum(n) {
        let buf;
        if (n < 253) {
            buf = [n]; // 1 byte
        }
        else if (n < 0x10000) {
            // 253 followed by the number in little-endian format
            buf = [
                253, // 0xfd
                n & 0xFF, // low byte
                (n >> 8) & 0xFF // high byte
            ];
        }
        else if (n < 0x100000000) {
            // 254 followed by the number in little-endian format
            buf = [
                254, // 0xfe
                n & 0xFF,
                (n >> 8) & 0xFF,
                (n >> 16) & 0xFF,
                (n >> 24) & 0xFF
            ];
        }
        else {
            // 255 followed by the number in little-endian format
            // Since JavaScript bitwise operations work on 32 bits, we need to handle 64-bit numbers in two parts
            const low = n & 0xFFFFFFFF;
            const high = Math.floor(n / 0x100000000) & 0xFFFFFFFF;
            buf = [
                255, // 0xff
                low & 0xFF,
                (low >> 8) & 0xFF,
                (low >> 16) & 0xFF,
                (low >> 24) & 0xFF,
                high & 0xFF,
                (high >> 8) & 0xFF,
                (high >> 16) & 0xFF,
                (high >> 24) & 0xFF
            ];
        }
        return buf;
    }
    static varIntBn(bn) {
        let buf;
        if (bn.ltn(253)) {
            const n = bn.toNumber();
            // No need for bitwise operation as the value is within a byte's range
            buf = [n];
        }
        else if (bn.ltn(0x10000)) {
            const n = bn.toNumber();
            // Value fits in a uint16
            buf = [253, n & 0xFF, (n >> 8) & 0xFF];
        }
        else if (bn.lt(new BigNumber(0x100000000))) {
            const n = bn.toNumber();
            // Value fits in a uint32
            buf = [254, n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF];
        }
        else {
            const bw = new Writer();
            bw.writeUInt8(255);
            bw.writeUInt64LEBn(bn);
            buf = bw.toArray();
        }
        return buf;
    }
}
class Reader {
    bin;
    pos;
    constructor(bin = [], pos = 0) {
        this.bin = bin;
        this.pos = pos;
    }
    eof() {
        return this.pos >= this.bin.length;
    }
    read(len = this.bin.length) {
        const start = this.pos;
        const end = this.pos + len;
        this.pos = end;
        return this.bin.slice(start, end);
    }
    readReverse(len = this.bin.length) {
        const buf2 = new Array(len);
        for (let i = 0; i < len; i++) {
            buf2[i] = this.bin[this.pos + len - 1 - i];
        }
        this.pos += len;
        return buf2;
    }
    readUInt8() {
        const val = this.bin[this.pos];
        this.pos += 1;
        return val;
    }
    readInt8() {
        const val = this.bin[this.pos];
        this.pos += 1;
        // If the sign bit is set, convert to negative value
        return (val & 0x80) !== 0 ? val - 0x100 : val;
    }
    readUInt16BE() {
        const val = (this.bin[this.pos] << 8) | this.bin[this.pos + 1];
        this.pos += 2;
        return val;
    }
    readInt16BE() {
        const val = this.readUInt16BE();
        // If the sign bit is set, convert to negative value
        return (val & 0x8000) !== 0 ? val - 0x10000 : val;
    }
    readUInt16LE() {
        const val = this.bin[this.pos] | (this.bin[this.pos + 1] << 8);
        this.pos += 2;
        return val;
    }
    readInt16LE() {
        const val = this.readUInt16LE();
        // If the sign bit is set, convert to negative value
        const x = (val & 0x8000) !== 0 ? val - 0x10000 : val;
        return x;
    }
    readUInt32BE() {
        const val = (this.bin[this.pos] * 0x1000000) + // Shift the first byte by 24 bits
            ((this.bin[this.pos + 1] << 16) | // Shift the second byte by 16 bits
                (this.bin[this.pos + 2] << 8) | // Shift the third byte by 8 bits
                this.bin[this.pos + 3]); // The fourth byte
        this.pos += 4;
        return val;
    }
    readInt32BE() {
        const val = this.readUInt32BE();
        // If the sign bit is set, convert to negative value
        return (val & 0x80000000) !== 0 ? val - 0x100000000 : val;
    }
    readUInt32LE() {
        const val = (this.bin[this.pos] |
            (this.bin[this.pos + 1] << 8) |
            (this.bin[this.pos + 2] << 16) |
            (this.bin[this.pos + 3] << 24)) >>> 0;
        this.pos += 4;
        return val;
    }
    readInt32LE() {
        const val = this.readUInt32LE();
        // Explicitly check if the sign bit is set and then convert to a negative value
        return (val & 0x80000000) !== 0 ? val - 0x100000000 : val;
    }
    readUInt64BEBn() {
        const bin = this.bin.slice(this.pos, this.pos + 8);
        const bn = new BigNumber(bin);
        this.pos = this.pos + 8;
        return bn;
    }
    readUInt64LEBn() {
        const bin = this.readReverse(8);
        const bn = new BigNumber(bin);
        return bn;
    }
    readVarIntNum() {
        const first = this.readUInt8();
        let bn;
        switch (first) {
            case 0xfd:
                return this.readUInt16LE();
            case 0xfe:
                return this.readUInt32LE();
            case 0xff:
                bn = this.readUInt64LEBn();
                if (bn.lte(new BigNumber(2).pow(new BigNumber(53)))) {
                    return bn.toNumber();
                }
                else {
                    throw new Error('number too large to retain precision - use readVarIntBn');
                }
            default:
                return first;
        }
    }
    readVarInt() {
        const first = this.bin[this.pos];
        switch (first) {
            case 0xfd:
                return this.read(1 + 2);
            case 0xfe:
                return this.read(1 + 4);
            case 0xff:
                return this.read(1 + 8);
            default:
                return this.read(1);
        }
    }
    readVarIntBn() {
        const first = this.readUInt8();
        switch (first) {
            case 0xfd:
                return new BigNumber(this.readUInt16LE());
            case 0xfe:
                return new BigNumber(this.readUInt32LE());
            case 0xff:
                return this.readUInt64LEBn();
            default:
                return new BigNumber(first);
        }
    }
}
const minimallyEncode = (buf) => {
    if (buf.length === 0) {
        return buf;
    }
    // If the last byte is not 0x00 or 0x80, we are minimally encoded.
    const last = buf[buf.length - 1];
    if ((last & 0x7f) !== 0) {
        return buf;
    }
    // If the script is one byte long, then we have a zero, which encodes as an
    // empty array.
    if (buf.length === 1) {
        return [];
    }
    // If the next byte has it sign bit set, then we are minimaly encoded.
    if ((buf[buf.length - 2] & 0x80) !== 0) {
        return buf;
    }
    // We are not minimally encoded, we need to figure out how much to trim.
    for (let i = buf.length - 1; i > 0; i--) {
        // We found a non zero byte, time to encode.
        if (buf[i - 1] !== 0) {
            if ((buf[i - 1] & 0x80) !== 0) {
                // We found a byte with it sign bit set so we need one more
                // byte.
                buf[i++] = last;
            }
            else {
                // the sign bit is clear, we can use it.
                buf[i - 1] |= last;
            }
            return buf.slice(0, i);
        }
    }
    // If we found the whole thing is zeros, then we have a zero.
    return [];
};

var n$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Reader: Reader,
    Writer: Writer,
    encode: encode,
    fromBase58: fromBase58,
    fromBase58Check: fromBase58Check,
    minimallyEncode: minimallyEncode,
    toArray: toArray,
    toBase58: toBase58,
    toBase58Check: toBase58Check,
    toBase64: toBase64,
    toHex: toHex,
    toUTF8: toUTF8,
    zero2: zero2
});

/**
 * `Point` class is a representation of an elliptic curve point with affine coordinates.
 * It extends the functionality of BasePoint and carries x, y coordinates of point on the curve.
 * It also introduces new methods for handling Point operations in elliptic curve.
 *
 * @class Point
 * @extends {BasePoint}
 *
 * @property x - The x-coordinate of the point.
 * @property y - The y-coordinate of the point.
 * @property inf - Flag to record if the point is at infinity in the Elliptic Curve.
 */
class Point extends BasePoint {
    static red = new ReductionContext('k256');
    static a = new BigNumber(0).toRed(Point.red);
    static b = new BigNumber(7).toRed(Point.red);
    static zero = new BigNumber(0).toRed(Point.red);
    x;
    y;
    inf;
    /**
     * Creates a point object from a given Array. These numbers can represent coordinates in hex format, or points
     * in multiple established formats.
     * The function verifies the integrity of the provided data and throws errors if inconsistencies are found.
     *
     * @method fromDER
     * @static
     * @param bytes - The point representation number array.
     * @returns Returns a new point representing the given string.
     * @throws `Error` If the point number[] value has a wrong length.
     * @throws `Error` If the point format is unknown.
     *
     * @example
     * const derPoint = [ 2, 18, 123, 108, 125, 83, 1, 251, 164, 214, 16, 119, 200, 216, 210, 193, 251, 193, 129, 67, 97, 146, 210, 216, 77, 254, 18, 6, 150, 190, 99, 198, 128 ];
     * const point = Point.fromDER(derPoint);
     */
    static fromDER(bytes) {
        const len = 32;
        // uncompressed, hybrid-odd, hybrid-even
        if ((bytes[0] === 0x04 || bytes[0] === 0x06 || bytes[0] === 0x07) &&
            bytes.length - 1 === 2 * len) {
            if (bytes[0] === 0x06) {
                if (bytes[bytes.length - 1] % 2 !== 0) {
                    throw new Error('Point string value is wrong length');
                }
            }
            else if (bytes[0] === 0x07) {
                if (bytes[bytes.length - 1] % 2 !== 1) {
                    throw new Error('Point string value is wrong length');
                }
            }
            const res = new Point(bytes.slice(1, 1 + len), bytes.slice(1 + len, 1 + 2 * len));
            return res;
        }
        else if ((bytes[0] === 0x02 || bytes[0] === 0x03) &&
            bytes.length - 1 === len) {
            return Point.fromX(bytes.slice(1, 1 + len), bytes[0] === 0x03);
        }
        throw new Error('Unknown point format');
    }
    /**
     * Creates a point object from a given string. This string can represent coordinates in hex format, or points
     * in multiple established formats.
     * The function verifies the integrity of the provided data and throws errors if inconsistencies are found.
     *
     * @method fromString
     * @static
     *
     * @param str The point representation string.
     * @returns Returns a new point representing the given string.
     * @throws `Error` If the point string value has a wrong length.
     * @throws `Error` If the point format is unknown.
     *
     * @example
     * const pointStr = 'abcdef';
     * const point = Point.fromString(pointStr);
     */
    static fromString(str) {
        const bytes = toArray(str, 'hex');
        return Point.fromDER(bytes);
    }
    static redSqrtOptimized(y2) {
        const red = Point.red;
        const p = red.m; // The modulus
        const exponent = p.addn(1).iushrn(2); // (p + 1) / 4
        return y2.redPow(exponent);
    }
    /**
     * Generates a point from an x coordinate and a boolean indicating whether the corresponding
     * y coordinate is odd.
     *
     * @method fromX
     * @static
     * @param x - The x coordinate of the point.
     * @param odd - Boolean indicating whether the corresponding y coordinate is odd or not.
     * @returns Returns the new point.
     * @throws `Error` If the point is invalid.
     *
     * @example
     * const xCoordinate = new BigNumber('10');
     * const point = Point.fromX(xCoordinate, true);
     */
    static fromX(x, odd) {
        if (typeof BigInt === 'function') {
            function mod(a, n) {
                return ((a % n) + n) % n;
            }
            function modPow(base, exponent, modulus) {
                let result = BigInt(1);
                base = mod(base, modulus);
                while (exponent > BigInt(0)) {
                    if ((exponent & BigInt(1)) === BigInt(1)) {
                        result = mod(result * base, modulus);
                    }
                    exponent >>= BigInt(1);
                    base = mod(base * base, modulus);
                }
                return result;
            }
            function sqrtMod(a, p) {
                const exponent = (p + BigInt(1)) >> BigInt(2); // Precomputed exponent
                const sqrtCandidate = modPow(a, exponent, p);
                if (mod(sqrtCandidate * sqrtCandidate, p) === mod(a, p)) {
                    return sqrtCandidate;
                }
                else {
                    // No square root exists
                    return null;
                }
            }
            // Curve parameters for secp256k1
            const p = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
            BigInt(0);
            const b = BigInt(7);
            // Convert x to BigInt
            let xBigInt;
            if (x instanceof BigNumber) {
                xBigInt = BigInt('0x' + x.toString(16));
            }
            else if (typeof x === 'string') {
                xBigInt = BigInt('0x' + x);
            }
            else if (Array.isArray(x)) {
                xBigInt = BigInt('0x' +
                    Buffer.from(x).toString('hex').padStart(64, '0'));
            }
            else if (typeof x === 'number') {
                xBigInt = BigInt(x);
            }
            else {
                throw new Error('Invalid x-coordinate type');
            }
            // Ensure x is within field range
            xBigInt = mod(xBigInt, p);
            // Compute y^2 = x^3 + a x + b mod p
            const y2 = mod(modPow(xBigInt, BigInt(3), p) + b, p);
            // Compute modular square root y = sqrt(y2) mod p
            let y = sqrtMod(y2, p);
            if (y === null) {
                throw new Error('Invalid point');
            }
            // Adjust y to match the oddness
            const isYOdd = (y % BigInt(2)) === BigInt(1);
            if ((odd && !isYOdd) || (!odd && isYOdd)) {
                y = p - y;
            }
            // Convert x and y to BigNumber
            const xBN = new BigNumber(xBigInt.toString(16), 16);
            const yBN = new BigNumber(y.toString(16), 16);
            return new Point(xBN, yBN);
        }
        else {
            const red = new ReductionContext('k256');
            const a = new BigNumber(0).toRed(red);
            const b = new BigNumber(7).toRed(red);
            const zero = new BigNumber(0).toRed(red);
            if (!BigNumber.isBN(x)) {
                x = new BigNumber(x, 16);
            }
            x = x;
            if (x.red == null) {
                x = x.toRed(red);
            }
            const y2 = x.redSqr().redMul(x).redIAdd(x.redMul(a)).redIAdd(b);
            let y = y2.redSqrt();
            if (y.redSqr().redSub(y2).cmp(zero) !== 0) {
                throw new Error('invalid point');
            }
            // XXX Is there any way to tell if the number is odd without converting it
            // to non-red form?
            const isOdd = y.fromRed().isOdd();
            if ((odd && !isOdd) || (!odd && isOdd)) {
                y = y.redNeg();
            }
            return new Point(x, y);
        }
    }
    /**
     * Generates a point from a serialized JSON object. The function accounts for different options in the JSON object,
     * including precomputed values for optimization of EC operations, and calls another helper function to turn nested
     * JSON points into proper Point objects.
     *
     * @method fromJSON
     * @static
     * @param obj - An object or array that holds the data for the point.
     * @param isRed - A boolean to direct how the Point is constructed from the JSON object.
     * @returns Returns a new point based on the deserialized JSON object.
     *
     * @example
     * const serializedPoint = '{"x":52,"y":15}';
     * const point = Point.fromJSON(serializedPoint, true);
     */
    static fromJSON(obj, isRed) {
        if (typeof obj === 'string') {
            obj = JSON.parse(obj);
        }
        const res = new Point(obj[0], obj[1], isRed);
        if (typeof obj[2] !== 'object') {
            return res;
        }
        const obj2point = (obj) => {
            return new Point(obj[0], obj[1], isRed);
        };
        const pre = obj[2];
        res.precomputed = {
            beta: null,
            doubles: typeof pre.doubles === 'object' && pre.doubles !== null
                ? {
                    step: pre.doubles.step,
                    points: [res].concat(pre.doubles.points.map(obj2point))
                }
                : undefined,
            naf: typeof pre.naf === 'object' && pre.naf !== null
                ? {
                    wnd: pre.naf.wnd,
                    points: [res].concat(pre.naf.points.map(obj2point))
                }
                : undefined
        };
        return res;
    }
    /**
     * @constructor
     * @param x - The x-coordinate of the point. May be a number, a BigNumber, a string (which will be interpreted as hex), a number array, or null. If null, an "Infinity" point is constructed.
     * @param y - The y-coordinate of the point, similar to x.
     * @param isRed - A boolean indicating if the point is a member of the field of integers modulo the k256 prime. Default is true.
     *
     * @example
     * new Point('abc123', 'def456');
     * new Point(null, null); // Generates Infinity point.
     */
    constructor(x, y, isRed = true) {
        super('affine');
        this.precomputed = null;
        if (x === null && y === null) {
            this.x = null;
            this.y = null;
            this.inf = true;
        }
        else {
            if (!BigNumber.isBN(x)) {
                x = new BigNumber(x, 16);
            }
            this.x = x;
            if (!BigNumber.isBN(y)) {
                y = new BigNumber(y, 16);
            }
            this.y = y;
            // Force redgomery representation when loading from JSON
            if (isRed) {
                this.x.forceRed(this.curve.red);
                this.y.forceRed(this.curve.red);
            }
            if (this.x.red === null) {
                this.x = this.x.toRed(this.curve.red);
            }
            if (this.y.red === null) {
                this.y = this.y.toRed(this.curve.red);
            }
            this.inf = false;
        }
    }
    /**
     * Validates if a point belongs to the curve. Follows the short Weierstrass
     * equation for elliptic curves: y^2 = x^3 + ax + b.
     *
     * @method validate
     * @returns {boolean} true if the point is on the curve, false otherwise.
     *
     * @example
     * const aPoint = new Point(x, y);
     * const isValid = aPoint.validate();
     */
    validate() {
        return this.curve.validate(this);
    }
    /**
     * Encodes the coordinates of a point into an array or a hexadecimal string.
     * The details of encoding are determined by the optional compact and enc parameters.
     *
     * @method encode
     * @param compact - If true, an additional prefix byte 0x02 or 0x03 based on the 'y' coordinate being even or odd respectively is used. If false, byte 0x04 is used.
     * @param enc - Expects the string 'hex' if hexadecimal string encoding is required instead of an array of numbers.
     * @throws Will throw an error if the specified encoding method is not recognized. Expects 'hex'.
     * @returns If enc is undefined, a byte array representation of the point will be returned. if enc is 'hex', a hexadecimal string representation of the point will be returned.
     *
     * @example
     * const aPoint = new Point(x, y);
     * const encodedPointArray = aPoint.encode();
     * const encodedPointHex = aPoint.encode(true, 'hex');
     */
    encode(compact = true, enc) {
        const len = this.curve.p.byteLength();
        const x = this.getX().toArray('be', len);
        let res;
        if (compact) {
            res = [this.getY().isEven() ? 0x02 : 0x03].concat(x);
        }
        else {
            res = [0x04].concat(x, this.getY().toArray('be', len));
        }
        if (enc !== 'hex') {
            return res;
        }
        else {
            return toHex(res);
        }
    }
    /**
     * Converts the point coordinates to a hexadecimal string. A wrapper method
     * for encode. Byte 0x02 or 0x03 is used as prefix based on the 'y' coordinate being even or odd respectively.
     *
     * @method toString
     * @returns {string} A hexadecimal string representation of the point coordinates.
     *
     * @example
     * const aPoint = new Point(x, y);
     * const stringPoint = aPoint.toString();
     */
    toString() {
        return this.encode(true, 'hex');
    }
    /**
     * Exports the x and y coordinates of the point, and the precomputed doubles and non-adjacent form (NAF) for optimization. The output is an array.
     *
     * @method toJSON
     * @returns An Array where first two elements are the coordinates of the point and optional third element is an object with doubles and NAF points.
     *
     * @example
     * const aPoint = new Point(x, y);
     * const jsonPoint = aPoint.toJSON();
     */
    toJSON() {
        if (this.precomputed == null) {
            return [this.x, this.y];
        }
        return [this.x, this.y, typeof this.precomputed === 'object' && this.precomputed !== null
                ? {
                    doubles: (this.precomputed.doubles != null)
                        ? {
                            step: this.precomputed.doubles.step,
                            points: this.precomputed.doubles.points.slice(1)
                        }
                        : undefined,
                    naf: (this.precomputed.naf != null)
                        ? {
                            wnd: this.precomputed.naf.wnd,
                            points: this.precomputed.naf.points.slice(1)
                        }
                        : undefined
                }
                : undefined];
    }
    /**
     * Provides the point coordinates in a human-readable string format for debugging purposes.
     *
     * @method inspect
     * @returns String of the format '<EC Point x: x-coordinate y: y-coordinate>', or '<EC Point Infinity>' if the point is at infinity.
     *
     * @example
     * const aPoint = new Point(x, y);
     * console.log(aPoint.inspect());
     */
    inspect() {
        if (this.isInfinity()) {
            return '<EC Point Infinity>';
        }
        return '<EC Point x: ' + this.x.fromRed().toString(16, 2) +
            ' y: ' + this.y.fromRed().toString(16, 2) + '>';
    }
    /**
     * Checks if the point is at infinity.
     * @method isInfinity
     * @returns Returns whether or not the point is at infinity.
     *
     * @example
     * const p = new Point(null, null);
     * console.log(p.isInfinity()); // outputs: true
     */
    isInfinity() {
        return this.inf;
    }
    /**
     * Adds another Point to this Point, returning a new Point.
     *
     * @method add
     * @param p - The Point to add to this one.
     * @returns A new Point that results from the addition.
     *
     * @example
     * const p1 = new Point(1, 2);
     * const p2 = new Point(2, 3);
     * const result = p1.add(p2);
     */
    add(p) {
        // O + P = P
        if (this.inf) {
            return p;
        }
        // P + O = P
        if (p.inf) {
            return this;
        }
        // P + P = 2P
        if (this.eq(p)) {
            return this.dbl();
        }
        // P + (-P) = O
        if (this.neg().eq(p)) {
            return new Point(null, null);
        }
        // P + Q = O
        if (this.x.cmp(p.x) === 0) {
            return new Point(null, null);
        }
        let c = this.y.redSub(p.y);
        if (c.cmpn(0) !== 0) {
            c = c.redMul(this.x.redSub(p.x).redInvm());
        }
        const nx = c.redSqr().redISub(this.x).redISub(p.x);
        const ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
        return new Point(nx, ny);
    }
    /**
     * Doubles the current point.
     *
     * @method dbl
     *
     * @example
     * const P = new Point('123', '456');
     * const result = P.dbl();
     * */
    dbl() {
        if (this.inf) {
            return this;
        }
        // 2P = O
        const ys1 = this.y.redAdd(this.y);
        if (ys1.cmpn(0) === 0) {
            return new Point(null, null);
        }
        const a = this.curve.a;
        const x2 = this.x.redSqr();
        const dyinv = ys1.redInvm();
        const c = x2.redAdd(x2).redIAdd(x2).redIAdd(a).redMul(dyinv);
        const nx = c.redSqr().redISub(this.x.redAdd(this.x));
        const ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
        return new Point(nx, ny);
    }
    /**
     * Returns X coordinate of point
     *
     * @example
     * const P = new Point('123', '456');
     * const x = P.getX();
     */
    getX() {
        return this.x.fromRed();
    }
    /**
     * Returns X coordinate of point
     *
     * @example
     * const P = new Point('123', '456');
     * const x = P.getX();
     */
    getY() {
        return this.y.fromRed();
    }
    /**
     * Multiplies this Point by a scalar value, returning a new Point.
     *
     * @method mul
     * @param k - The scalar value to multiply this Point by.
     * @returns  A new Point that results from the multiplication.
     *
     * @example
     * const p = new Point(1, 2);
     * const result = p.mul(2); // this doubles the Point
     */
    mul(k) {
        if (!BigNumber.isBN(k)) {
            k = new BigNumber(k, 16);
        }
        k = k;
        if (this.isInfinity()) {
            return this;
        }
        else if (this._hasDoubles(k)) {
            return this._fixedNafMul(k);
        }
        else {
            return this._endoWnafMulAdd([this], [k]);
        }
    }
    /**
     * Performs a multiplication and addition operation in a single step.
     * Multiplies this Point by k1, adds the resulting Point to the result of p2 multiplied by k2.
     *
     * @method mulAdd
     * @param k1 - The scalar value to multiply this Point by.
     * @param p2 - The other Point to be involved in the operation.
     * @param k2 - The scalar value to multiply the Point p2 by.
     * @returns A Point that results from the combined multiplication and addition operations.
     *
     * @example
     * const p1 = new Point(1, 2);
     * const p2 = new Point(2, 3);
     * const result = p1.mulAdd(2, p2, 3);
     */
    mulAdd(k1, p2, k2) {
        const points = [this, p2];
        const coeffs = [k1, k2];
        return this._endoWnafMulAdd(points, coeffs);
    }
    /**
     * Performs the Jacobian multiplication and addition operation in a single
     * step. Instead of returning a regular Point, the result is a JacobianPoint.
     *
     * @method jmulAdd
     * @param k1 - The scalar value to multiply this Point by.
     * @param p2 - The other Point to be involved in the operation
     * @param k2 - The scalar value to multiply the Point p2 by.
     * @returns A JacobianPoint that results from the combined multiplication and addition operation.
     *
     * @example
     * const p1 = new Point(1, 2);
     * const p2 = new Point(2, 3);
     * const result = p1.jmulAdd(2, p2, 3);
     */
    jmulAdd(k1, p2, k2) {
        const points = [this, p2];
        const coeffs = [k1, k2];
        return this._endoWnafMulAdd(points, coeffs, true);
    }
    /**
     * Checks if the Point instance is equal to another given Point.
     *
     * @method eq
     * @param p - The Point to be checked if equal to the current instance.
     *
     * @returns Whether the two Point instances are equal. Both the 'x' and 'y' coordinates have to match, and both points have to either be valid or at infinity for equality. If both conditions are true, it returns true, else it returns false.
     *
     * @example
     * const p1 = new Point(5, 20);
     * const p2 = new Point(5, 20);
     * const areEqual = p1.eq(p2); // returns true
     */
    eq(p) {
        return this === p || ((this.inf === p.inf) &&
            (this.inf || (this.x.cmp(p.x) === 0 && this.y.cmp(p.y) === 0)));
    }
    /**
     * Negate a point. The negation of a point P is the mirror of P about x-axis.
     *
     * @method neg
     *
     * @example
     * const P = new Point('123', '456');
     * const result = P.neg();
     */
    neg(_precompute) {
        if (this.inf) {
            return this;
        }
        const res = new Point(this.x, this.y.redNeg());
        if (_precompute && (this.precomputed != null)) {
            const pre = this.precomputed;
            const negate = (p) => p.neg();
            res.precomputed = {
                naf: (pre.naf != null) && {
                    wnd: pre.naf.wnd,
                    points: pre.naf.points.map(negate)
                },
                doubles: (pre.doubles != null) && {
                    step: pre.doubles.step,
                    points: pre.doubles.points.map((p) => p.neg())
                },
                beta: undefined
            };
        }
        return res;
    }
    /**
     * Performs the "doubling" operation on the Point a given number of times.
     * This is used in elliptic curve operations to perform multiplication by 2, multiple times.
     * If the point is at infinity, it simply returns the point because doubling
     * a point at infinity is still infinity.
     *
     * @method dblp
     * @param k - The number of times the "doubling" operation is to be performed on the Point.
     * @returns The Point after 'k' "doubling" operations have been performed.
     *
     * @example
     * const p = new Point(5, 20);
     * const doubledPoint = p.dblp(10); // returns the point after "doubled" 10 times
     */
    dblp(k) {
        /* eslint-disable @typescript-eslint/no-this-alias */
        let r = this;
        for (let i = 0; i < k; i++) {
            r = r.dbl();
        }
        return r;
    }
    /**
     * Converts the point to a Jacobian point. If the point is at infinity, the corresponding Jacobian point
     * will also be at infinity.
     *
     * @method toJ
     * @returns Returns a new Jacobian point based on the current point.
     *
     * @example
     * const point = new Point(xCoordinate, yCoordinate);
     * const jacobianPoint = point.toJ();
     */
    toJ() {
        if (this.inf) {
            return new JacobianPoint(null, null, null);
        }
        const res = new JacobianPoint(this.x, this.y, this.curve.one);
        return res;
    }
    _getBeta() {
        if (typeof this.curve.endo !== 'object') {
            return;
        }
        const pre = this.precomputed;
        if (typeof pre === 'object' && pre !== null && typeof pre.beta === 'object' && pre.beta !== null) {
            return pre.beta;
        }
        const beta = new Point(this.x.redMul(this.curve.endo.beta), this.y);
        if (pre != null) {
            const curve = this.curve;
            const endoMul = (p) => {
                return new Point(p.x.redMul(curve.endo.beta), p.y);
            };
            pre.beta = beta;
            beta.precomputed = {
                beta: null,
                naf: (pre.naf != null)
                    ? {
                        wnd: pre.naf.wnd,
                        points: pre.naf.points.map(endoMul)
                    }
                    : undefined,
                doubles: (pre.doubles != null)
                    ? {
                        step: pre.doubles.step,
                        points: pre.doubles.points.map(endoMul)
                    }
                    : undefined
            };
        }
        return beta;
    }
    _fixedNafMul(k) {
        if (typeof this.precomputed !== 'object' || this.precomputed === null) {
            throw new Error('_fixedNafMul requires precomputed values for the point');
        }
        const doubles = this._getDoubles();
        const naf = this.curve.getNAF(k, 1, this.curve._bitLength);
        let I = (1 << (doubles.step + 1)) - (doubles.step % 2 === 0 ? 2 : 1);
        I /= 3;
        // Translate into more windowed form
        const repr = [];
        for (let j = 0; j < naf.length; j += doubles.step) {
            let nafW = 0;
            for (let k = j + doubles.step - 1; k >= j; k--) {
                nafW = (nafW << 1) + naf[k];
            }
            repr.push(nafW);
        }
        let a = new JacobianPoint(null, null, null);
        let b = new JacobianPoint(null, null, null);
        for (let i = I; i > 0; i--) {
            for (let j = 0; j < repr.length; j++) {
                const nafW = repr[j];
                if (nafW === i) {
                    b = b.mixedAdd(doubles.points[j]);
                }
                else if (nafW === -i) {
                    b = b.mixedAdd((doubles.points[j]).neg());
                }
            }
            a = a.add(b);
        }
        return a.toP();
    }
    _wnafMulAdd(defW, points, coeffs, len, jacobianResult) {
        const wndWidth = this.curve._wnafT1;
        const wnd = this.curve._wnafT2;
        const naf = this.curve._wnafT3;
        // Fill all arrays
        let max = 0;
        for (let i = 0; i < len; i++) {
            const p = points[i];
            const nafPoints = p._getNAFPoints(defW);
            wndWidth[i] = nafPoints.wnd;
            wnd[i] = nafPoints.points;
        }
        // Comb small window NAFs
        for (let i = len - 1; i >= 1; i -= 2) {
            const a = i - 1;
            const b = i;
            if (wndWidth[a] !== 1 || wndWidth[b] !== 1) {
                naf[a] = this.curve
                    .getNAF(coeffs[a], wndWidth[a], this.curve._bitLength);
                naf[b] = this.curve
                    .getNAF(coeffs[b], wndWidth[b], this.curve._bitLength);
                max = Math.max(naf[a].length, max);
                max = Math.max(naf[b].length, max);
                continue;
            }
            const comb = [
                points[a], /* 1 */
                null, /* 3 */
                null, /* 5 */
                points[b] /* 7 */
            ];
            // Try to avoid Projective points, if possible
            if (points[a].y.cmp(points[b].y) === 0) {
                comb[1] = points[a].add(points[b]);
                comb[2] = points[a].toJ().mixedAdd(points[b].neg());
            }
            else if (points[a].y.cmp(points[b].y.redNeg()) === 0) {
                comb[1] = points[a].toJ().mixedAdd(points[b]);
                comb[2] = points[a].add(points[b].neg());
            }
            else {
                comb[1] = points[a].toJ().mixedAdd(points[b]);
                comb[2] = points[a].toJ().mixedAdd(points[b].neg());
            }
            const index = [
                -3, /* -1 -1 */
                -1, /* -1 0 */
                -5, /* -1 1 */
                -7, /* 0 -1 */
                0, /* 0 0 */
                7, /* 0 1 */
                5, /* 1 -1 */
                1, /* 1 0 */
                3 /* 1 1 */
            ];
            const jsf = this.curve.getJSF(coeffs[a], coeffs[b]);
            max = Math.max(jsf[0].length, max);
            naf[a] = new Array(max);
            naf[b] = new Array(max);
            for (let j = 0; j < max; j++) {
                const ja = jsf[0][j] | 0;
                const jb = jsf[1][j] | 0;
                naf[a][j] = index[(ja + 1) * 3 + (jb + 1)];
                naf[b][j] = 0;
                wnd[a] = comb;
            }
        }
        let acc = new JacobianPoint(null, null, null);
        const tmp = this.curve._wnafT4;
        for (let i = max; i >= 0; i--) {
            let k = 0;
            while (i >= 0) {
                let zero = true;
                for (let j = 0; j < len; j++) {
                    tmp[j] = naf[j][i] | 0;
                    if (tmp[j] !== 0) {
                        zero = false;
                    }
                }
                if (!zero) {
                    break;
                }
                k++;
                i--;
            }
            if (i >= 0) {
                k++;
            }
            acc = acc.dblp(k);
            if (i < 0) {
                break;
            }
            for (let j = 0; j < len; j++) {
                const z = tmp[j];
                let p;
                if (z === 0) {
                    continue;
                }
                else if (z > 0) {
                    p = wnd[j][(z - 1) >> 1];
                }
                else if (z < 0) {
                    p = wnd[j][(-z - 1) >> 1].neg();
                }
                if (p.type === 'affine') {
                    acc = acc.mixedAdd(p);
                }
                else {
                    acc = acc.add(p);
                }
            }
        }
        // Zeroify references
        for (let i = 0; i < len; i++) {
            wnd[i] = null;
        }
        if (jacobianResult) {
            return acc;
        }
        else {
            return acc.toP();
        }
    }
    _endoWnafMulAdd(points, coeffs, jacobianResult) {
        const npoints = this.curve._endoWnafT1;
        const ncoeffs = this.curve._endoWnafT2;
        let i;
        for (i = 0; i < points.length; i++) {
            const split = this.curve._endoSplit(coeffs[i]);
            let p = points[i];
            let beta = p._getBeta();
            if (split.k1.negative !== 0) {
                split.k1.ineg();
                p = p.neg(true);
            }
            if (split.k2.negative !== 0) {
                split.k2.ineg();
                beta = beta.neg(true);
            }
            npoints[i * 2] = p;
            npoints[i * 2 + 1] = beta;
            ncoeffs[i * 2] = split.k1;
            ncoeffs[i * 2 + 1] = split.k2;
        }
        const res = this._wnafMulAdd(1, npoints, ncoeffs, i * 2, jacobianResult);
        // Clean-up references to points and coefficients
        for (let j = 0; j < i * 2; j++) {
            npoints[j] = null;
            ncoeffs[j] = null;
        }
        return res;
    }
    _hasDoubles(k) {
        if (this.precomputed == null) {
            return false;
        }
        const doubles = this.precomputed.doubles;
        if (typeof doubles !== 'object') {
            return false;
        }
        return doubles.points.length >= Math.ceil((k.bitLength() + 1) / doubles.step);
    }
    ;
    _getDoubles(step, power) {
        if (typeof this.precomputed === 'object' && this.precomputed !== null &&
            typeof this.precomputed.doubles === 'object' &&
            this.precomputed.doubles !== null) {
            return this.precomputed.doubles;
        }
        const doubles = [this];
        /* eslint-disable @typescript-eslint/no-this-alias */
        let acc = this;
        for (let i = 0; i < power; i += step) {
            for (let j = 0; j < step; j++) {
                acc = acc.dbl();
            }
            doubles.push(acc);
        }
        return {
            step,
            points: doubles
        };
    }
    ;
    _getNAFPoints(wnd) {
        if (typeof this.precomputed === 'object' && this.precomputed !== null &&
            typeof this.precomputed.naf === 'object' && this.precomputed.naf !== null) {
            return this.precomputed.naf;
        }
        const res = [this];
        const max = (1 << wnd) - 1;
        const dbl = max === 1 ? null : this.dbl();
        for (let i = 1; i < max; i++) {
            res[i] = res[i - 1].add(dbl);
        }
        return {
            wnd,
            points: res
        };
    }
}

// This ensures that only one curve is ever created, enhancing performance.
// This assumes there is never a need to have multiple distinct Curve instances.
// So far, this assumption has proven to be valid.
let globalCurve;
class Curve {
    p;
    red;
    redN;
    zero;
    one;
    two;
    g;
    n;
    a;
    b;
    tinv;
    zeroA;
    threeA;
    endo; // beta, lambda, basis
    _endoWnafT1;
    _endoWnafT2;
    _wnafT1;
    _wnafT2;
    _wnafT3;
    _wnafT4;
    _bitLength;
    // Represent num in a w-NAF form
    static assert(expression, message = 'Elliptic curve assertion failed') {
        if (!expression) {
            throw new Error(message);
        }
    }
    getNAF(num, w, bits) {
        const naf = new Array(Math.max(num.bitLength(), bits) + 1);
        naf.fill(0);
        const ws = 1 << (w + 1);
        const k = num.clone();
        for (let i = 0; i < naf.length; i++) {
            let z;
            const mod = k.andln(ws - 1);
            if (k.isOdd()) {
                if (mod > (ws >> 1) - 1) {
                    z = (ws >> 1) - mod;
                }
                else {
                    z = mod;
                }
                k.isubn(z);
            }
            else {
                z = 0;
            }
            naf[i] = z;
            k.iushrn(1);
        }
        return naf;
    }
    // Represent k1, k2 in a Joint Sparse Form
    getJSF(k1, k2) {
        const jsf = [
            [],
            []
        ];
        k1 = k1.clone();
        k2 = k2.clone();
        let d1 = 0;
        let d2 = 0;
        while (k1.cmpn(-d1) > 0 || k2.cmpn(-d2) > 0) {
            // First phase
            let m14 = (k1.andln(3) + d1) & 3;
            let m24 = (k2.andln(3) + d2) & 3;
            if (m14 === 3) {
                m14 = -1;
            }
            if (m24 === 3) {
                m24 = -1;
            }
            let u1;
            if ((m14 & 1) === 0) {
                u1 = 0;
            }
            else {
                const m8 = (k1.andln(7) + d1) & 7;
                if ((m8 === 3 || m8 === 5) && m24 === 2) {
                    u1 = -m14;
                }
                else {
                    u1 = m14;
                }
            }
            jsf[0].push(u1);
            let u2;
            if ((m24 & 1) === 0) {
                u2 = 0;
            }
            else {
                const m8 = (k2.andln(7) + d2) & 7;
                if ((m8 === 3 || m8 === 5) && m14 === 2) {
                    u2 = -m24;
                }
                else {
                    u2 = m24;
                }
            }
            jsf[1].push(u2);
            // Second phase
            if (2 * d1 === u1 + 1) {
                d1 = 1 - d1;
            }
            if (2 * d2 === u2 + 1) {
                d2 = 1 - d2;
            }
            k1.iushrn(1);
            k2.iushrn(1);
        }
        return jsf;
    }
    static cachedProperty(obj, name, computer) {
        const key = '_' + name;
        obj.prototype[name] = function cachedProperty() {
            const r = this[key] !== undefined
                ? this[key]
                : this[key] = computer.call(this);
            return r;
        };
    }
    static parseBytes(bytes) {
        return typeof bytes === 'string'
            ? toArray(bytes, 'hex')
            : bytes;
    }
    static intFromLE(bytes) {
        return new BigNumber(bytes, 'hex', 'le');
    }
    constructor() {
        if (typeof globalCurve !== 'undefined') {
            return globalCurve;
        }
        else {
            /* eslint-disable @typescript-eslint/no-this-alias */
            globalCurve = this;
        }
        const precomputed = {
            doubles: {
                step: 4,
                points: [
                    [
                        'e60fce93b59e9ec53011aabc21c23e97b2a31369b87a5ae9c44ee89e2a6dec0a',
                        'f7e3507399e595929db99f34f57937101296891e44d23f0be1f32cce69616821'
                    ],
                    [
                        '8282263212c609d9ea2a6e3e172de238d8c39cabd5ac1ca10646e23fd5f51508',
                        '11f8a8098557dfe45e8256e830b60ace62d613ac2f7b17bed31b6eaff6e26caf'
                    ],
                    [
                        '175e159f728b865a72f99cc6c6fc846de0b93833fd2222ed73fce5b551e5b739',
                        'd3506e0d9e3c79eba4ef97a51ff71f5eacb5955add24345c6efa6ffee9fed695'
                    ],
                    [
                        '363d90d447b00c9c99ceac05b6262ee053441c7e55552ffe526bad8f83ff4640',
                        '4e273adfc732221953b445397f3363145b9a89008199ecb62003c7f3bee9de9'
                    ],
                    [
                        '8b4b5f165df3c2be8c6244b5b745638843e4a781a15bcd1b69f79a55dffdf80c',
                        '4aad0a6f68d308b4b3fbd7813ab0da04f9e336546162ee56b3eff0c65fd4fd36'
                    ],
                    [
                        '723cbaa6e5db996d6bf771c00bd548c7b700dbffa6c0e77bcb6115925232fcda',
                        '96e867b5595cc498a921137488824d6e2660a0653779494801dc069d9eb39f5f'
                    ],
                    [
                        'eebfa4d493bebf98ba5feec812c2d3b50947961237a919839a533eca0e7dd7fa',
                        '5d9a8ca3970ef0f269ee7edaf178089d9ae4cdc3a711f712ddfd4fdae1de8999'
                    ],
                    [
                        '100f44da696e71672791d0a09b7bde459f1215a29b3c03bfefd7835b39a48db0',
                        'cdd9e13192a00b772ec8f3300c090666b7ff4a18ff5195ac0fbd5cd62bc65a09'
                    ],
                    [
                        'e1031be262c7ed1b1dc9227a4a04c017a77f8d4464f3b3852c8acde6e534fd2d',
                        '9d7061928940405e6bb6a4176597535af292dd419e1ced79a44f18f29456a00d'
                    ],
                    [
                        'feea6cae46d55b530ac2839f143bd7ec5cf8b266a41d6af52d5e688d9094696d',
                        'e57c6b6c97dce1bab06e4e12bf3ecd5c981c8957cc41442d3155debf18090088'
                    ],
                    [
                        'da67a91d91049cdcb367be4be6ffca3cfeed657d808583de33fa978bc1ec6cb1',
                        '9bacaa35481642bc41f463f7ec9780e5dec7adc508f740a17e9ea8e27a68be1d'
                    ],
                    [
                        '53904faa0b334cdda6e000935ef22151ec08d0f7bb11069f57545ccc1a37b7c0',
                        '5bc087d0bc80106d88c9eccac20d3c1c13999981e14434699dcb096b022771c8'
                    ],
                    [
                        '8e7bcd0bd35983a7719cca7764ca906779b53a043a9b8bcaeff959f43ad86047',
                        '10b7770b2a3da4b3940310420ca9514579e88e2e47fd68b3ea10047e8460372a'
                    ],
                    [
                        '385eed34c1cdff21e6d0818689b81bde71a7f4f18397e6690a841e1599c43862',
                        '283bebc3e8ea23f56701de19e9ebf4576b304eec2086dc8cc0458fe5542e5453'
                    ],
                    [
                        '6f9d9b803ecf191637c73a4413dfa180fddf84a5947fbc9c606ed86c3fac3a7',
                        '7c80c68e603059ba69b8e2a30e45c4d47ea4dd2f5c281002d86890603a842160'
                    ],
                    [
                        '3322d401243c4e2582a2147c104d6ecbf774d163db0f5e5313b7e0e742d0e6bd',
                        '56e70797e9664ef5bfb019bc4ddaf9b72805f63ea2873af624f3a2e96c28b2a0'
                    ],
                    [
                        '85672c7d2de0b7da2bd1770d89665868741b3f9af7643397721d74d28134ab83',
                        '7c481b9b5b43b2eb6374049bfa62c2e5e77f17fcc5298f44c8e3094f790313a6'
                    ],
                    [
                        '948bf809b1988a46b06c9f1919413b10f9226c60f668832ffd959af60c82a0a',
                        '53a562856dcb6646dc6b74c5d1c3418c6d4dff08c97cd2bed4cb7f88d8c8e589'
                    ],
                    [
                        '6260ce7f461801c34f067ce0f02873a8f1b0e44dfc69752accecd819f38fd8e8',
                        'bc2da82b6fa5b571a7f09049776a1ef7ecd292238051c198c1a84e95b2b4ae17'
                    ],
                    [
                        'e5037de0afc1d8d43d8348414bbf4103043ec8f575bfdc432953cc8d2037fa2d',
                        '4571534baa94d3b5f9f98d09fb990bddbd5f5b03ec481f10e0e5dc841d755bda'
                    ],
                    [
                        'e06372b0f4a207adf5ea905e8f1771b4e7e8dbd1c6a6c5b725866a0ae4fce725',
                        '7a908974bce18cfe12a27bb2ad5a488cd7484a7787104870b27034f94eee31dd'
                    ],
                    [
                        '213c7a715cd5d45358d0bbf9dc0ce02204b10bdde2a3f58540ad6908d0559754',
                        '4b6dad0b5ae462507013ad06245ba190bb4850f5f36a7eeddff2c27534b458f2'
                    ],
                    [
                        '4e7c272a7af4b34e8dbb9352a5419a87e2838c70adc62cddf0cc3a3b08fbd53c',
                        '17749c766c9d0b18e16fd09f6def681b530b9614bff7dd33e0b3941817dcaae6'
                    ],
                    [
                        'fea74e3dbe778b1b10f238ad61686aa5c76e3db2be43057632427e2840fb27b6',
                        '6e0568db9b0b13297cf674deccb6af93126b596b973f7b77701d3db7f23cb96f'
                    ],
                    [
                        '76e64113f677cf0e10a2570d599968d31544e179b760432952c02a4417bdde39',
                        'c90ddf8dee4e95cf577066d70681f0d35e2a33d2b56d2032b4b1752d1901ac01'
                    ],
                    [
                        'c738c56b03b2abe1e8281baa743f8f9a8f7cc643df26cbee3ab150242bcbb891',
                        '893fb578951ad2537f718f2eacbfbbbb82314eef7880cfe917e735d9699a84c3'
                    ],
                    [
                        'd895626548b65b81e264c7637c972877d1d72e5f3a925014372e9f6588f6c14b',
                        'febfaa38f2bc7eae728ec60818c340eb03428d632bb067e179363ed75d7d991f'
                    ],
                    [
                        'b8da94032a957518eb0f6433571e8761ceffc73693e84edd49150a564f676e03',
                        '2804dfa44805a1e4d7c99cc9762808b092cc584d95ff3b511488e4e74efdf6e7'
                    ],
                    [
                        'e80fea14441fb33a7d8adab9475d7fab2019effb5156a792f1a11778e3c0df5d',
                        'eed1de7f638e00771e89768ca3ca94472d155e80af322ea9fcb4291b6ac9ec78'
                    ],
                    [
                        'a301697bdfcd704313ba48e51d567543f2a182031efd6915ddc07bbcc4e16070',
                        '7370f91cfb67e4f5081809fa25d40f9b1735dbf7c0a11a130c0d1a041e177ea1'
                    ],
                    [
                        '90ad85b389d6b936463f9d0512678de208cc330b11307fffab7ac63e3fb04ed4',
                        'e507a3620a38261affdcbd9427222b839aefabe1582894d991d4d48cb6ef150'
                    ],
                    [
                        '8f68b9d2f63b5f339239c1ad981f162ee88c5678723ea3351b7b444c9ec4c0da',
                        '662a9f2dba063986de1d90c2b6be215dbbea2cfe95510bfdf23cbf79501fff82'
                    ],
                    [
                        'e4f3fb0176af85d65ff99ff9198c36091f48e86503681e3e6686fd5053231e11',
                        '1e63633ad0ef4f1c1661a6d0ea02b7286cc7e74ec951d1c9822c38576feb73bc'
                    ],
                    [
                        '8c00fa9b18ebf331eb961537a45a4266c7034f2f0d4e1d0716fb6eae20eae29e',
                        'efa47267fea521a1a9dc343a3736c974c2fadafa81e36c54e7d2a4c66702414b'
                    ],
                    [
                        'e7a26ce69dd4829f3e10cec0a9e98ed3143d084f308b92c0997fddfc60cb3e41',
                        '2a758e300fa7984b471b006a1aafbb18d0a6b2c0420e83e20e8a9421cf2cfd51'
                    ],
                    [
                        'b6459e0ee3662ec8d23540c223bcbdc571cbcb967d79424f3cf29eb3de6b80ef',
                        '67c876d06f3e06de1dadf16e5661db3c4b3ae6d48e35b2ff30bf0b61a71ba45'
                    ],
                    [
                        'd68a80c8280bb840793234aa118f06231d6f1fc67e73c5a5deda0f5b496943e8',
                        'db8ba9fff4b586d00c4b1f9177b0e28b5b0e7b8f7845295a294c84266b133120'
                    ],
                    [
                        '324aed7df65c804252dc0270907a30b09612aeb973449cea4095980fc28d3d5d',
                        '648a365774b61f2ff130c0c35aec1f4f19213b0c7e332843967224af96ab7c84'
                    ],
                    [
                        '4df9c14919cde61f6d51dfdbe5fee5dceec4143ba8d1ca888e8bd373fd054c96',
                        '35ec51092d8728050974c23a1d85d4b5d506cdc288490192ebac06cad10d5d'
                    ],
                    [
                        '9c3919a84a474870faed8a9c1cc66021523489054d7f0308cbfc99c8ac1f98cd',
                        'ddb84f0f4a4ddd57584f044bf260e641905326f76c64c8e6be7e5e03d4fc599d'
                    ],
                    [
                        '6057170b1dd12fdf8de05f281d8e06bb91e1493a8b91d4cc5a21382120a959e5',
                        '9a1af0b26a6a4807add9a2daf71df262465152bc3ee24c65e899be932385a2a8'
                    ],
                    [
                        'a576df8e23a08411421439a4518da31880cef0fba7d4df12b1a6973eecb94266',
                        '40a6bf20e76640b2c92b97afe58cd82c432e10a7f514d9f3ee8be11ae1b28ec8'
                    ],
                    [
                        '7778a78c28dec3e30a05fe9629de8c38bb30d1f5cf9a3a208f763889be58ad71',
                        '34626d9ab5a5b22ff7098e12f2ff580087b38411ff24ac563b513fc1fd9f43ac'
                    ],
                    [
                        '928955ee637a84463729fd30e7afd2ed5f96274e5ad7e5cb09eda9c06d903ac',
                        'c25621003d3f42a827b78a13093a95eeac3d26efa8a8d83fc5180e935bcd091f'
                    ],
                    [
                        '85d0fef3ec6db109399064f3a0e3b2855645b4a907ad354527aae75163d82751',
                        '1f03648413a38c0be29d496e582cf5663e8751e96877331582c237a24eb1f962'
                    ],
                    [
                        'ff2b0dce97eece97c1c9b6041798b85dfdfb6d8882da20308f5404824526087e',
                        '493d13fef524ba188af4c4dc54d07936c7b7ed6fb90e2ceb2c951e01f0c29907'
                    ],
                    [
                        '827fbbe4b1e880ea9ed2b2e6301b212b57f1ee148cd6dd28780e5e2cf856e241',
                        'c60f9c923c727b0b71bef2c67d1d12687ff7a63186903166d605b68baec293ec'
                    ],
                    [
                        'eaa649f21f51bdbae7be4ae34ce6e5217a58fdce7f47f9aa7f3b58fa2120e2b3',
                        'be3279ed5bbbb03ac69a80f89879aa5a01a6b965f13f7e59d47a5305ba5ad93d'
                    ],
                    [
                        'e4a42d43c5cf169d9391df6decf42ee541b6d8f0c9a137401e23632dda34d24f',
                        '4d9f92e716d1c73526fc99ccfb8ad34ce886eedfa8d8e4f13a7f7131deba9414'
                    ],
                    [
                        '1ec80fef360cbdd954160fadab352b6b92b53576a88fea4947173b9d4300bf19',
                        'aeefe93756b5340d2f3a4958a7abbf5e0146e77f6295a07b671cdc1cc107cefd'
                    ],
                    [
                        '146a778c04670c2f91b00af4680dfa8bce3490717d58ba889ddb5928366642be',
                        'b318e0ec3354028add669827f9d4b2870aaa971d2f7e5ed1d0b297483d83efd0'
                    ],
                    [
                        'fa50c0f61d22e5f07e3acebb1aa07b128d0012209a28b9776d76a8793180eef9',
                        '6b84c6922397eba9b72cd2872281a68a5e683293a57a213b38cd8d7d3f4f2811'
                    ],
                    [
                        'da1d61d0ca721a11b1a5bf6b7d88e8421a288ab5d5bba5220e53d32b5f067ec2',
                        '8157f55a7c99306c79c0766161c91e2966a73899d279b48a655fba0f1ad836f1'
                    ],
                    [
                        'a8e282ff0c9706907215ff98e8fd416615311de0446f1e062a73b0610d064e13',
                        '7f97355b8db81c09abfb7f3c5b2515888b679a3e50dd6bd6cef7c73111f4cc0c'
                    ],
                    [
                        '174a53b9c9a285872d39e56e6913cab15d59b1fa512508c022f382de8319497c',
                        'ccc9dc37abfc9c1657b4155f2c47f9e6646b3a1d8cb9854383da13ac079afa73'
                    ],
                    [
                        '959396981943785c3d3e57edf5018cdbe039e730e4918b3d884fdff09475b7ba',
                        '2e7e552888c331dd8ba0386a4b9cd6849c653f64c8709385e9b8abf87524f2fd'
                    ],
                    [
                        'd2a63a50ae401e56d645a1153b109a8fcca0a43d561fba2dbb51340c9d82b151',
                        'e82d86fb6443fcb7565aee58b2948220a70f750af484ca52d4142174dcf89405'
                    ],
                    [
                        '64587e2335471eb890ee7896d7cfdc866bacbdbd3839317b3436f9b45617e073',
                        'd99fcdd5bf6902e2ae96dd6447c299a185b90a39133aeab358299e5e9faf6589'
                    ],
                    [
                        '8481bde0e4e4d885b3a546d3e549de042f0aa6cea250e7fd358d6c86dd45e458',
                        '38ee7b8cba5404dd84a25bf39cecb2ca900a79c42b262e556d64b1b59779057e'
                    ],
                    [
                        '13464a57a78102aa62b6979ae817f4637ffcfed3c4b1ce30bcd6303f6caf666b',
                        '69be159004614580ef7e433453ccb0ca48f300a81d0942e13f495a907f6ecc27'
                    ],
                    [
                        'bc4a9df5b713fe2e9aef430bcc1dc97a0cd9ccede2f28588cada3a0d2d83f366',
                        'd3a81ca6e785c06383937adf4b798caa6e8a9fbfa547b16d758d666581f33c1'
                    ],
                    [
                        '8c28a97bf8298bc0d23d8c749452a32e694b65e30a9472a3954ab30fe5324caa',
                        '40a30463a3305193378fedf31f7cc0eb7ae784f0451cb9459e71dc73cbef9482'
                    ],
                    [
                        '8ea9666139527a8c1dd94ce4f071fd23c8b350c5a4bb33748c4ba111faccae0',
                        '620efabbc8ee2782e24e7c0cfb95c5d735b783be9cf0f8e955af34a30e62b945'
                    ],
                    [
                        'dd3625faef5ba06074669716bbd3788d89bdde815959968092f76cc4eb9a9787',
                        '7a188fa3520e30d461da2501045731ca941461982883395937f68d00c644a573'
                    ],
                    [
                        'f710d79d9eb962297e4f6232b40e8f7feb2bc63814614d692c12de752408221e',
                        'ea98e67232d3b3295d3b535532115ccac8612c721851617526ae47a9c77bfc82'
                    ]
                ]
            },
            naf: {
                wnd: 7,
                points: [
                    [
                        'f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
                        '388f7b0f632de8140fe337e62a37f3566500a99934c2231b6cb9fd7584b8e672'
                    ],
                    [
                        '2f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4',
                        'd8ac222636e5e3d6d4dba9dda6c9c426f788271bab0d6840dca87d3aa6ac62d6'
                    ],
                    [
                        '5cbdf0646e5db4eaa398f365f2ea7a0e3d419b7e0330e39ce92bddedcac4f9bc',
                        '6aebca40ba255960a3178d6d861a54dba813d0b813fde7b5a5082628087264da'
                    ],
                    [
                        'acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe',
                        'cc338921b0a7d9fd64380971763b61e9add888a4375f8e0f05cc262ac64f9c37'
                    ],
                    [
                        '774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb',
                        'd984a032eb6b5e190243dd56d7b7b365372db1e2dff9d6a8301d74c9c953c61b'
                    ],
                    [
                        'f28773c2d975288bc7d1d205c3748651b075fbc6610e58cddeeddf8f19405aa8',
                        'ab0902e8d880a89758212eb65cdaf473a1a06da521fa91f29b5cb52db03ed81'
                    ],
                    [
                        'd7924d4f7d43ea965a465ae3095ff41131e5946f3c85f79e44adbcf8e27e080e',
                        '581e2872a86c72a683842ec228cc6defea40af2bd896d3a5c504dc9ff6a26b58'
                    ],
                    [
                        'defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34',
                        '4211ab0694635168e997b0ead2a93daeced1f4a04a95c0f6cfb199f69e56eb77'
                    ],
                    [
                        '2b4ea0a797a443d293ef5cff444f4979f06acfebd7e86d277475656138385b6c',
                        '85e89bc037945d93b343083b5a1c86131a01f60c50269763b570c854e5c09b7a'
                    ],
                    [
                        '352bbf4a4cdd12564f93fa332ce333301d9ad40271f8107181340aef25be59d5',
                        '321eb4075348f534d59c18259dda3e1f4a1b3b2e71b1039c67bd3d8bcf81998c'
                    ],
                    [
                        '2fa2104d6b38d11b0230010559879124e42ab8dfeff5ff29dc9cdadd4ecacc3f',
                        '2de1068295dd865b64569335bd5dd80181d70ecfc882648423ba76b532b7d67'
                    ],
                    [
                        '9248279b09b4d68dab21a9b066edda83263c3d84e09572e269ca0cd7f5453714',
                        '73016f7bf234aade5d1aa71bdea2b1ff3fc0de2a887912ffe54a32ce97cb3402'
                    ],
                    [
                        'daed4f2be3a8bf278e70132fb0beb7522f570e144bf615c07e996d443dee8729',
                        'a69dce4a7d6c98e8d4a1aca87ef8d7003f83c230f3afa726ab40e52290be1c55'
                    ],
                    [
                        'c44d12c7065d812e8acf28d7cbb19f9011ecd9e9fdf281b0e6a3b5e87d22e7db',
                        '2119a460ce326cdc76c45926c982fdac0e106e861edf61c5a039063f0e0e6482'
                    ],
                    [
                        '6a245bf6dc698504c89a20cfded60853152b695336c28063b61c65cbd269e6b4',
                        'e022cf42c2bd4a708b3f5126f16a24ad8b33ba48d0423b6efd5e6348100d8a82'
                    ],
                    [
                        '1697ffa6fd9de627c077e3d2fe541084ce13300b0bec1146f95ae57f0d0bd6a5',
                        'b9c398f186806f5d27561506e4557433a2cf15009e498ae7adee9d63d01b2396'
                    ],
                    [
                        '605bdb019981718b986d0f07e834cb0d9deb8360ffb7f61df982345ef27a7479',
                        '2972d2de4f8d20681a78d93ec96fe23c26bfae84fb14db43b01e1e9056b8c49'
                    ],
                    [
                        '62d14dab4150bf497402fdc45a215e10dcb01c354959b10cfe31c7e9d87ff33d',
                        '80fc06bd8cc5b01098088a1950eed0db01aa132967ab472235f5642483b25eaf'
                    ],
                    [
                        '80c60ad0040f27dade5b4b06c408e56b2c50e9f56b9b8b425e555c2f86308b6f',
                        '1c38303f1cc5c30f26e66bad7fe72f70a65eed4cbe7024eb1aa01f56430bd57a'
                    ],
                    [
                        '7a9375ad6167ad54aa74c6348cc54d344cc5dc9487d847049d5eabb0fa03c8fb',
                        'd0e3fa9eca8726909559e0d79269046bdc59ea10c70ce2b02d499ec224dc7f7'
                    ],
                    [
                        'd528ecd9b696b54c907a9ed045447a79bb408ec39b68df504bb51f459bc3ffc9',
                        'eecf41253136e5f99966f21881fd656ebc4345405c520dbc063465b521409933'
                    ],
                    [
                        '49370a4b5f43412ea25f514e8ecdad05266115e4a7ecb1387231808f8b45963',
                        '758f3f41afd6ed428b3081b0512fd62a54c3f3afbb5b6764b653052a12949c9a'
                    ],
                    [
                        '77f230936ee88cbbd73df930d64702ef881d811e0e1498e2f1c13eb1fc345d74',
                        '958ef42a7886b6400a08266e9ba1b37896c95330d97077cbbe8eb3c7671c60d6'
                    ],
                    [
                        'f2dac991cc4ce4b9ea44887e5c7c0bce58c80074ab9d4dbaeb28531b7739f530',
                        'e0dedc9b3b2f8dad4da1f32dec2531df9eb5fbeb0598e4fd1a117dba703a3c37'
                    ],
                    [
                        '463b3d9f662621fb1b4be8fbbe2520125a216cdfc9dae3debcba4850c690d45b',
                        '5ed430d78c296c3543114306dd8622d7c622e27c970a1de31cb377b01af7307e'
                    ],
                    [
                        'f16f804244e46e2a09232d4aff3b59976b98fac14328a2d1a32496b49998f247',
                        'cedabd9b82203f7e13d206fcdf4e33d92a6c53c26e5cce26d6579962c4e31df6'
                    ],
                    [
                        'caf754272dc84563b0352b7a14311af55d245315ace27c65369e15f7151d41d1',
                        'cb474660ef35f5f2a41b643fa5e460575f4fa9b7962232a5c32f908318a04476'
                    ],
                    [
                        '2600ca4b282cb986f85d0f1709979d8b44a09c07cb86d7c124497bc86f082120',
                        '4119b88753c15bd6a693b03fcddbb45d5ac6be74ab5f0ef44b0be9475a7e4b40'
                    ],
                    [
                        '7635ca72d7e8432c338ec53cd12220bc01c48685e24f7dc8c602a7746998e435',
                        '91b649609489d613d1d5e590f78e6d74ecfc061d57048bad9e76f302c5b9c61'
                    ],
                    [
                        '754e3239f325570cdbbf4a87deee8a66b7f2b33479d468fbc1a50743bf56cc18',
                        '673fb86e5bda30fb3cd0ed304ea49a023ee33d0197a695d0c5d98093c536683'
                    ],
                    [
                        'e3e6bd1071a1e96aff57859c82d570f0330800661d1c952f9fe2694691d9b9e8',
                        '59c9e0bba394e76f40c0aa58379a3cb6a5a2283993e90c4167002af4920e37f5'
                    ],
                    [
                        '186b483d056a033826ae73d88f732985c4ccb1f32ba35f4b4cc47fdcf04aa6eb',
                        '3b952d32c67cf77e2e17446e204180ab21fb8090895138b4a4a797f86e80888b'
                    ],
                    [
                        'df9d70a6b9876ce544c98561f4be4f725442e6d2b737d9c91a8321724ce0963f',
                        '55eb2dafd84d6ccd5f862b785dc39d4ab157222720ef9da217b8c45cf2ba2417'
                    ],
                    [
                        '5edd5cc23c51e87a497ca815d5dce0f8ab52554f849ed8995de64c5f34ce7143',
                        'efae9c8dbc14130661e8cec030c89ad0c13c66c0d17a2905cdc706ab7399a868'
                    ],
                    [
                        '290798c2b6476830da12fe02287e9e777aa3fba1c355b17a722d362f84614fba',
                        'e38da76dcd440621988d00bcf79af25d5b29c094db2a23146d003afd41943e7a'
                    ],
                    [
                        'af3c423a95d9f5b3054754efa150ac39cd29552fe360257362dfdecef4053b45',
                        'f98a3fd831eb2b749a93b0e6f35cfb40c8cd5aa667a15581bc2feded498fd9c6'
                    ],
                    [
                        '766dbb24d134e745cccaa28c99bf274906bb66b26dcf98df8d2fed50d884249a',
                        '744b1152eacbe5e38dcc887980da38b897584a65fa06cedd2c924f97cbac5996'
                    ],
                    [
                        '59dbf46f8c94759ba21277c33784f41645f7b44f6c596a58ce92e666191abe3e',
                        'c534ad44175fbc300f4ea6ce648309a042ce739a7919798cd85e216c4a307f6e'
                    ],
                    [
                        'f13ada95103c4537305e691e74e9a4a8dd647e711a95e73cb62dc6018cfd87b8',
                        'e13817b44ee14de663bf4bc808341f326949e21a6a75c2570778419bdaf5733d'
                    ],
                    [
                        '7754b4fa0e8aced06d4167a2c59cca4cda1869c06ebadfb6488550015a88522c',
                        '30e93e864e669d82224b967c3020b8fa8d1e4e350b6cbcc537a48b57841163a2'
                    ],
                    [
                        '948dcadf5990e048aa3874d46abef9d701858f95de8041d2a6828c99e2262519',
                        'e491a42537f6e597d5d28a3224b1bc25df9154efbd2ef1d2cbba2cae5347d57e'
                    ],
                    [
                        '7962414450c76c1689c7b48f8202ec37fb224cf5ac0bfa1570328a8a3d7c77ab',
                        '100b610ec4ffb4760d5c1fc133ef6f6b12507a051f04ac5760afa5b29db83437'
                    ],
                    [
                        '3514087834964b54b15b160644d915485a16977225b8847bb0dd085137ec47ca',
                        'ef0afbb2056205448e1652c48e8127fc6039e77c15c2378b7e7d15a0de293311'
                    ],
                    [
                        'd3cc30ad6b483e4bc79ce2c9dd8bc54993e947eb8df787b442943d3f7b527eaf',
                        '8b378a22d827278d89c5e9be8f9508ae3c2ad46290358630afb34db04eede0a4'
                    ],
                    [
                        '1624d84780732860ce1c78fcbfefe08b2b29823db913f6493975ba0ff4847610',
                        '68651cf9b6da903e0914448c6cd9d4ca896878f5282be4c8cc06e2a404078575'
                    ],
                    [
                        '733ce80da955a8a26902c95633e62a985192474b5af207da6df7b4fd5fc61cd4',
                        'f5435a2bd2badf7d485a4d8b8db9fcce3e1ef8e0201e4578c54673bc1dc5ea1d'
                    ],
                    [
                        '15d9441254945064cf1a1c33bbd3b49f8966c5092171e699ef258dfab81c045c',
                        'd56eb30b69463e7234f5137b73b84177434800bacebfc685fc37bbe9efe4070d'
                    ],
                    [
                        'a1d0fcf2ec9de675b612136e5ce70d271c21417c9d2b8aaaac138599d0717940',
                        'edd77f50bcb5a3cab2e90737309667f2641462a54070f3d519212d39c197a629'
                    ],
                    [
                        'e22fbe15c0af8ccc5780c0735f84dbe9a790badee8245c06c7ca37331cb36980',
                        'a855babad5cd60c88b430a69f53a1a7a38289154964799be43d06d77d31da06'
                    ],
                    [
                        '311091dd9860e8e20ee13473c1155f5f69635e394704eaa74009452246cfa9b3',
                        '66db656f87d1f04fffd1f04788c06830871ec5a64feee685bd80f0b1286d8374'
                    ],
                    [
                        '34c1fd04d301be89b31c0442d3e6ac24883928b45a9340781867d4232ec2dbdf',
                        '9414685e97b1b5954bd46f730174136d57f1ceeb487443dc5321857ba73abee'
                    ],
                    [
                        'f219ea5d6b54701c1c14de5b557eb42a8d13f3abbcd08affcc2a5e6b049b8d63',
                        '4cb95957e83d40b0f73af4544cccf6b1f4b08d3c07b27fb8d8c2962a400766d1'
                    ],
                    [
                        'd7b8740f74a8fbaab1f683db8f45de26543a5490bca627087236912469a0b448',
                        'fa77968128d9c92ee1010f337ad4717eff15db5ed3c049b3411e0315eaa4593b'
                    ],
                    [
                        '32d31c222f8f6f0ef86f7c98d3a3335ead5bcd32abdd94289fe4d3091aa824bf',
                        '5f3032f5892156e39ccd3d7915b9e1da2e6dac9e6f26e961118d14b8462e1661'
                    ],
                    [
                        '7461f371914ab32671045a155d9831ea8793d77cd59592c4340f86cbc18347b5',
                        '8ec0ba238b96bec0cbdddcae0aa442542eee1ff50c986ea6b39847b3cc092ff6'
                    ],
                    [
                        'ee079adb1df1860074356a25aa38206a6d716b2c3e67453d287698bad7b2b2d6',
                        '8dc2412aafe3be5c4c5f37e0ecc5f9f6a446989af04c4e25ebaac479ec1c8c1e'
                    ],
                    [
                        '16ec93e447ec83f0467b18302ee620f7e65de331874c9dc72bfd8616ba9da6b5',
                        '5e4631150e62fb40d0e8c2a7ca5804a39d58186a50e497139626778e25b0674d'
                    ],
                    [
                        'eaa5f980c245f6f038978290afa70b6bd8855897f98b6aa485b96065d537bd99',
                        'f65f5d3e292c2e0819a528391c994624d784869d7e6ea67fb18041024edc07dc'
                    ],
                    [
                        '78c9407544ac132692ee1910a02439958ae04877151342ea96c4b6b35a49f51',
                        'f3e0319169eb9b85d5404795539a5e68fa1fbd583c064d2462b675f194a3ddb4'
                    ],
                    [
                        '494f4be219a1a77016dcd838431aea0001cdc8ae7a6fc688726578d9702857a5',
                        '42242a969283a5f339ba7f075e36ba2af925ce30d767ed6e55f4b031880d562c'
                    ],
                    [
                        'a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5',
                        '204b5d6f84822c307e4b4a7140737aec23fc63b65b35f86a10026dbd2d864e6b'
                    ],
                    [
                        'c41916365abb2b5d09192f5f2dbeafec208f020f12570a184dbadc3e58595997',
                        '4f14351d0087efa49d245b328984989d5caf9450f34bfc0ed16e96b58fa9913'
                    ],
                    [
                        '841d6063a586fa475a724604da03bc5b92a2e0d2e0a36acfe4c73a5514742881',
                        '73867f59c0659e81904f9a1c7543698e62562d6744c169ce7a36de01a8d6154'
                    ],
                    [
                        '5e95bb399a6971d376026947f89bde2f282b33810928be4ded112ac4d70e20d5',
                        '39f23f366809085beebfc71181313775a99c9aed7d8ba38b161384c746012865'
                    ],
                    [
                        '36e4641a53948fd476c39f8a99fd974e5ec07564b5315d8bf99471bca0ef2f66',
                        'd2424b1b1abe4eb8164227b085c9aa9456ea13493fd563e06fd51cf5694c78fc'
                    ],
                    [
                        '336581ea7bfbbb290c191a2f507a41cf5643842170e914faeab27c2c579f726',
                        'ead12168595fe1be99252129b6e56b3391f7ab1410cd1e0ef3dcdcabd2fda224'
                    ],
                    [
                        '8ab89816dadfd6b6a1f2634fcf00ec8403781025ed6890c4849742706bd43ede',
                        '6fdcef09f2f6d0a044e654aef624136f503d459c3e89845858a47a9129cdd24e'
                    ],
                    [
                        '1e33f1a746c9c5778133344d9299fcaa20b0938e8acff2544bb40284b8c5fb94',
                        '60660257dd11b3aa9c8ed618d24edff2306d320f1d03010e33a7d2057f3b3b6'
                    ],
                    [
                        '85b7c1dcb3cec1b7ee7f30ded79dd20a0ed1f4cc18cbcfcfa410361fd8f08f31',
                        '3d98a9cdd026dd43f39048f25a8847f4fcafad1895d7a633c6fed3c35e999511'
                    ],
                    [
                        '29df9fbd8d9e46509275f4b125d6d45d7fbe9a3b878a7af872a2800661ac5f51',
                        'b4c4fe99c775a606e2d8862179139ffda61dc861c019e55cd2876eb2a27d84b'
                    ],
                    [
                        'a0b1cae06b0a847a3fea6e671aaf8adfdfe58ca2f768105c8082b2e449fce252',
                        'ae434102edde0958ec4b19d917a6a28e6b72da1834aff0e650f049503a296cf2'
                    ],
                    [
                        '4e8ceafb9b3e9a136dc7ff67e840295b499dfb3b2133e4ba113f2e4c0e121e5',
                        'cf2174118c8b6d7a4b48f6d534ce5c79422c086a63460502b827ce62a326683c'
                    ],
                    [
                        'd24a44e047e19b6f5afb81c7ca2f69080a5076689a010919f42725c2b789a33b',
                        '6fb8d5591b466f8fc63db50f1c0f1c69013f996887b8244d2cdec417afea8fa3'
                    ],
                    [
                        'ea01606a7a6c9cdd249fdfcfacb99584001edd28abbab77b5104e98e8e3b35d4',
                        '322af4908c7312b0cfbfe369f7a7b3cdb7d4494bc2823700cfd652188a3ea98d'
                    ],
                    [
                        'af8addbf2b661c8a6c6328655eb96651252007d8c5ea31be4ad196de8ce2131f',
                        '6749e67c029b85f52a034eafd096836b2520818680e26ac8f3dfbcdb71749700'
                    ],
                    [
                        'e3ae1974566ca06cc516d47e0fb165a674a3dabcfca15e722f0e3450f45889',
                        '2aeabe7e4531510116217f07bf4d07300de97e4874f81f533420a72eeb0bd6a4'
                    ],
                    [
                        '591ee355313d99721cf6993ffed1e3e301993ff3ed258802075ea8ced397e246',
                        'b0ea558a113c30bea60fc4775460c7901ff0b053d25ca2bdeee98f1a4be5d196'
                    ],
                    [
                        '11396d55fda54c49f19aa97318d8da61fa8584e47b084945077cf03255b52984',
                        '998c74a8cd45ac01289d5833a7beb4744ff536b01b257be4c5767bea93ea57a4'
                    ],
                    [
                        '3c5d2a1ba39c5a1790000738c9e0c40b8dcdfd5468754b6405540157e017aa7a',
                        'b2284279995a34e2f9d4de7396fc18b80f9b8b9fdd270f6661f79ca4c81bd257'
                    ],
                    [
                        'cc8704b8a60a0defa3a99a7299f2e9c3fbc395afb04ac078425ef8a1793cc030',
                        'bdd46039feed17881d1e0862db347f8cf395b74fc4bcdc4e940b74e3ac1f1b13'
                    ],
                    [
                        'c533e4f7ea8555aacd9777ac5cad29b97dd4defccc53ee7ea204119b2889b197',
                        '6f0a256bc5efdf429a2fb6242f1a43a2d9b925bb4a4b3a26bb8e0f45eb596096'
                    ],
                    [
                        'c14f8f2ccb27d6f109f6d08d03cc96a69ba8c34eec07bbcf566d48e33da6593',
                        'c359d6923bb398f7fd4473e16fe1c28475b740dd098075e6c0e8649113dc3a38'
                    ],
                    [
                        'a6cbc3046bc6a450bac24789fa17115a4c9739ed75f8f21ce441f72e0b90e6ef',
                        '21ae7f4680e889bb130619e2c0f95a360ceb573c70603139862afd617fa9b9f'
                    ],
                    [
                        '347d6d9a02c48927ebfb86c1359b1caf130a3c0267d11ce6344b39f99d43cc38',
                        '60ea7f61a353524d1c987f6ecec92f086d565ab687870cb12689ff1e31c74448'
                    ],
                    [
                        'da6545d2181db8d983f7dcb375ef5866d47c67b1bf31c8cf855ef7437b72656a',
                        '49b96715ab6878a79e78f07ce5680c5d6673051b4935bd897fea824b77dc208a'
                    ],
                    [
                        'c40747cc9d012cb1a13b8148309c6de7ec25d6945d657146b9d5994b8feb1111',
                        '5ca560753be2a12fc6de6caf2cb489565db936156b9514e1bb5e83037e0fa2d4'
                    ],
                    [
                        '4e42c8ec82c99798ccf3a610be870e78338c7f713348bd34c8203ef4037f3502',
                        '7571d74ee5e0fb92a7a8b33a07783341a5492144cc54bcc40a94473693606437'
                    ],
                    [
                        '3775ab7089bc6af823aba2e1af70b236d251cadb0c86743287522a1b3b0dedea',
                        'be52d107bcfa09d8bcb9736a828cfa7fac8db17bf7a76a2c42ad961409018cf7'
                    ],
                    [
                        'cee31cbf7e34ec379d94fb814d3d775ad954595d1314ba8846959e3e82f74e26',
                        '8fd64a14c06b589c26b947ae2bcf6bfa0149ef0be14ed4d80f448a01c43b1c6d'
                    ],
                    [
                        'b4f9eaea09b6917619f6ea6a4eb5464efddb58fd45b1ebefcdc1a01d08b47986',
                        '39e5c9925b5a54b07433a4f18c61726f8bb131c012ca542eb24a8ac07200682a'
                    ],
                    [
                        'd4263dfc3d2df923a0179a48966d30ce84e2515afc3dccc1b77907792ebcc60e',
                        '62dfaf07a0f78feb30e30d6295853ce189e127760ad6cf7fae164e122a208d54'
                    ],
                    [
                        '48457524820fa65a4f8d35eb6930857c0032acc0a4a2de422233eeda897612c4',
                        '25a748ab367979d98733c38a1fa1c2e7dc6cc07db2d60a9ae7a76aaa49bd0f77'
                    ],
                    [
                        'dfeeef1881101f2cb11644f3a2afdfc2045e19919152923f367a1767c11cceda',
                        'ecfb7056cf1de042f9420bab396793c0c390bde74b4bbdff16a83ae09a9a7517'
                    ],
                    [
                        '6d7ef6b17543f8373c573f44e1f389835d89bcbc6062ced36c82df83b8fae859',
                        'cd450ec335438986dfefa10c57fea9bcc521a0959b2d80bbf74b190dca712d10'
                    ],
                    [
                        'e75605d59102a5a2684500d3b991f2e3f3c88b93225547035af25af66e04541f',
                        'f5c54754a8f71ee540b9b48728473e314f729ac5308b06938360990e2bfad125'
                    ],
                    [
                        'eb98660f4c4dfaa06a2be453d5020bc99a0c2e60abe388457dd43fefb1ed620c',
                        '6cb9a8876d9cb8520609af3add26cd20a0a7cd8a9411131ce85f44100099223e'
                    ],
                    [
                        '13e87b027d8514d35939f2e6892b19922154596941888336dc3563e3b8dba942',
                        'fef5a3c68059a6dec5d624114bf1e91aac2b9da568d6abeb2570d55646b8adf1'
                    ],
                    [
                        'ee163026e9fd6fe017c38f06a5be6fc125424b371ce2708e7bf4491691e5764a',
                        '1acb250f255dd61c43d94ccc670d0f58f49ae3fa15b96623e5430da0ad6c62b2'
                    ],
                    [
                        'b268f5ef9ad51e4d78de3a750c2dc89b1e626d43505867999932e5db33af3d80',
                        '5f310d4b3c99b9ebb19f77d41c1dee018cf0d34fd4191614003e945a1216e423'
                    ],
                    [
                        'ff07f3118a9df035e9fad85eb6c7bfe42b02f01ca99ceea3bf7ffdba93c4750d',
                        '438136d603e858a3a5c440c38eccbaddc1d2942114e2eddd4740d098ced1f0d8'
                    ],
                    [
                        '8d8b9855c7c052a34146fd20ffb658bea4b9f69e0d825ebec16e8c3ce2b526a1',
                        'cdb559eedc2d79f926baf44fb84ea4d44bcf50fee51d7ceb30e2e7f463036758'
                    ],
                    [
                        '52db0b5384dfbf05bfa9d472d7ae26dfe4b851ceca91b1eba54263180da32b63',
                        'c3b997d050ee5d423ebaf66a6db9f57b3180c902875679de924b69d84a7b375'
                    ],
                    [
                        'e62f9490d3d51da6395efd24e80919cc7d0f29c3f3fa48c6fff543becbd43352',
                        '6d89ad7ba4876b0b22c2ca280c682862f342c8591f1daf5170e07bfd9ccafa7d'
                    ],
                    [
                        '7f30ea2476b399b4957509c88f77d0191afa2ff5cb7b14fd6d8e7d65aaab1193',
                        'ca5ef7d4b231c94c3b15389a5f6311e9daff7bb67b103e9880ef4bff637acaec'
                    ],
                    [
                        '5098ff1e1d9f14fb46a210fada6c903fef0fb7b4a1dd1d9ac60a0361800b7a00',
                        '9731141d81fc8f8084d37c6e7542006b3ee1b40d60dfe5362a5b132fd17ddc0'
                    ],
                    [
                        '32b78c7de9ee512a72895be6b9cbefa6e2f3c4ccce445c96b9f2c81e2778ad58',
                        'ee1849f513df71e32efc3896ee28260c73bb80547ae2275ba497237794c8753c'
                    ],
                    [
                        'e2cb74fddc8e9fbcd076eef2a7c72b0ce37d50f08269dfc074b581550547a4f7',
                        'd3aa2ed71c9dd2247a62df062736eb0baddea9e36122d2be8641abcb005cc4a4'
                    ],
                    [
                        '8438447566d4d7bedadc299496ab357426009a35f235cb141be0d99cd10ae3a8',
                        'c4e1020916980a4da5d01ac5e6ad330734ef0d7906631c4f2390426b2edd791f'
                    ],
                    [
                        '4162d488b89402039b584c6fc6c308870587d9c46f660b878ab65c82c711d67e',
                        '67163e903236289f776f22c25fb8a3afc1732f2b84b4e95dbda47ae5a0852649'
                    ],
                    [
                        '3fad3fa84caf0f34f0f89bfd2dcf54fc175d767aec3e50684f3ba4a4bf5f683d',
                        'cd1bc7cb6cc407bb2f0ca647c718a730cf71872e7d0d2a53fa20efcdfe61826'
                    ],
                    [
                        '674f2600a3007a00568c1a7ce05d0816c1fb84bf1370798f1c69532faeb1a86b',
                        '299d21f9413f33b3edf43b257004580b70db57da0b182259e09eecc69e0d38a5'
                    ],
                    [
                        'd32f4da54ade74abb81b815ad1fb3b263d82d6c692714bcff87d29bd5ee9f08f',
                        'f9429e738b8e53b968e99016c059707782e14f4535359d582fc416910b3eea87'
                    ],
                    [
                        '30e4e670435385556e593657135845d36fbb6931f72b08cb1ed954f1e3ce3ff6',
                        '462f9bce619898638499350113bbc9b10a878d35da70740dc695a559eb88db7b'
                    ],
                    [
                        'be2062003c51cc3004682904330e4dee7f3dcd10b01e580bf1971b04d4cad297',
                        '62188bc49d61e5428573d48a74e1c655b1c61090905682a0d5558ed72dccb9bc'
                    ],
                    [
                        '93144423ace3451ed29e0fb9ac2af211cb6e84a601df5993c419859fff5df04a',
                        '7c10dfb164c3425f5c71a3f9d7992038f1065224f72bb9d1d902a6d13037b47c'
                    ],
                    [
                        'b015f8044f5fcbdcf21ca26d6c34fb8197829205c7b7d2a7cb66418c157b112c',
                        'ab8c1e086d04e813744a655b2df8d5f83b3cdc6faa3088c1d3aea1454e3a1d5f'
                    ],
                    [
                        'd5e9e1da649d97d89e4868117a465a3a4f8a18de57a140d36b3f2af341a21b52',
                        '4cb04437f391ed73111a13cc1d4dd0db1693465c2240480d8955e8592f27447a'
                    ],
                    [
                        'd3ae41047dd7ca065dbf8ed77b992439983005cd72e16d6f996a5316d36966bb',
                        'bd1aeb21ad22ebb22a10f0303417c6d964f8cdd7df0aca614b10dc14d125ac46'
                    ],
                    [
                        '463e2763d885f958fc66cdd22800f0a487197d0a82e377b49f80af87c897b065',
                        'bfefacdb0e5d0fd7df3a311a94de062b26b80c61fbc97508b79992671ef7ca7f'
                    ],
                    [
                        '7985fdfd127c0567c6f53ec1bb63ec3158e597c40bfe747c83cddfc910641917',
                        '603c12daf3d9862ef2b25fe1de289aed24ed291e0ec6708703a5bd567f32ed03'
                    ],
                    [
                        '74a1ad6b5f76e39db2dd249410eac7f99e74c59cb83d2d0ed5ff1543da7703e9',
                        'cc6157ef18c9c63cd6193d83631bbea0093e0968942e8c33d5737fd790e0db08'
                    ],
                    [
                        '30682a50703375f602d416664ba19b7fc9bab42c72747463a71d0896b22f6da3',
                        '553e04f6b018b4fa6c8f39e7f311d3176290d0e0f19ca73f17714d9977a22ff8'
                    ],
                    [
                        '9e2158f0d7c0d5f26c3791efefa79597654e7a2b2464f52b1ee6c1347769ef57',
                        '712fcdd1b9053f09003a3481fa7762e9ffd7c8ef35a38509e2fbf2629008373'
                    ],
                    [
                        '176e26989a43c9cfeba4029c202538c28172e566e3c4fce7322857f3be327d66',
                        'ed8cc9d04b29eb877d270b4878dc43c19aefd31f4eee09ee7b47834c1fa4b1c3'
                    ],
                    [
                        '75d46efea3771e6e68abb89a13ad747ecf1892393dfc4f1b7004788c50374da8',
                        '9852390a99507679fd0b86fd2b39a868d7efc22151346e1a3ca4726586a6bed8'
                    ],
                    [
                        '809a20c67d64900ffb698c4c825f6d5f2310fb0451c869345b7319f645605721',
                        '9e994980d9917e22b76b061927fa04143d096ccc54963e6a5ebfa5f3f8e286c1'
                    ],
                    [
                        '1b38903a43f7f114ed4500b4eac7083fdefece1cf29c63528d563446f972c180',
                        '4036edc931a60ae889353f77fd53de4a2708b26b6f5da72ad3394119daf408f9'
                    ]
                ]
            }
        };
        const conf = {
            prime: 'k256',
            p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f',
            a: '0',
            b: '7',
            n: 'ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141',
            h: '1',
            // Precomputed endomorphism
            beta: '7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee',
            lambda: '5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72',
            basis: [
                {
                    a: '3086d221a7d46bcde86c90e49284eb15',
                    b: '-e4437ed6010e88286f547fa90abfe4c3'
                },
                {
                    a: '114ca50f7a8e2f3f657c1108d9d44cfd8',
                    b: '3086d221a7d46bcde86c90e49284eb15'
                }
            ],
            gRed: false,
            g: [
                '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
                '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
                precomputed
            ]
        };
        this.p = new BigNumber(conf.p, 16);
        // Use Montgomery, when there is no fast reduction for the prime
        this.red = new ReductionContext(conf.prime);
        // Useful for many curves
        this.zero = new BigNumber(0).toRed(this.red);
        this.one = new BigNumber(1).toRed(this.red);
        this.two = new BigNumber(2).toRed(this.red);
        // Curve configuration, optional
        this.n = new BigNumber(conf.n, 16);
        this.g = Point.fromJSON(conf.g, conf.gRed);
        // Temporary arrays
        this._wnafT1 = new Array(4);
        this._wnafT2 = new Array(4);
        this._wnafT3 = new Array(4);
        this._wnafT4 = new Array(4);
        this._bitLength = this.n.bitLength();
        this.redN = this.n.toRed(this.red);
        this.a = new BigNumber(conf.a, 16).toRed(this.red);
        this.b = new BigNumber(conf.b, 16).toRed(this.red);
        this.tinv = this.two.redInvm();
        this.zeroA = this.a.fromRed().cmpn(0) === 0;
        this.threeA = this.a.fromRed().sub(this.p).cmpn(-3) === 0;
        // If the curve is endomorphic, precalculate beta and lambda
        this.endo = this._getEndomorphism(conf);
        this._endoWnafT1 = new Array(4);
        this._endoWnafT2 = new Array(4);
    }
    _getEndomorphism(conf) {
        // No efficient endomorphism
        if (!this.zeroA || this.p.modrn(3) !== 1) {
            return;
        }
        // Compute beta and lambda, that lambda * P = (beta * Px; Py)
        let beta;
        let lambda;
        if (conf.beta !== undefined) {
            beta = new BigNumber(conf.beta, 16).toRed(this.red);
        }
        else {
            const betas = this._getEndoRoots(this.p);
            // Choose the smallest beta
            beta = betas[0].cmp(betas[1]) < 0 ? betas[0] : betas[1];
            beta = beta.toRed(this.red);
        }
        if (conf.lambda !== undefined) {
            lambda = new BigNumber(conf.lambda, 16);
        }
        else {
            // Choose the lambda that is matching selected beta
            const lambdas = this._getEndoRoots(this.n);
            if (this.g.mul(lambdas[0]).x.cmp(this.g.x.redMul(beta)) === 0) {
                lambda = lambdas[0];
            }
            else {
                lambda = lambdas[1];
                Curve.assert(this.g.mul(lambda).x.cmp(this.g.x.redMul(beta)) === 0);
            }
        }
        // Get basis vectors, used for balanced length-two representation
        let basis;
        if (typeof conf.basis === 'object' && conf.basis !== null) {
            basis = conf.basis.map(function (vec) {
                return {
                    a: new BigNumber(vec.a, 16),
                    b: new BigNumber(vec.b, 16)
                };
            });
        }
        else {
            basis = this._getEndoBasis(lambda);
        }
        return {
            beta,
            lambda,
            basis
        };
    }
    ;
    _getEndoRoots(num) {
        // Find roots of for x^2 + x + 1 in F
        // Root = (-1 +- Sqrt(-3)) / 2
        //
        const red = num === this.p ? this.red : new MontgomoryMethod(num);
        const tinv = new BigNumber(2).toRed(red).redInvm();
        const ntinv = tinv.redNeg();
        const s = new BigNumber(3).toRed(red).redNeg().redSqrt().redMul(tinv);
        const l1 = ntinv.redAdd(s).fromRed();
        const l2 = ntinv.redSub(s).fromRed();
        return [l1, l2];
    }
    ;
    _getEndoBasis(lambda) {
        // aprxSqrt >= sqrt(this.n)
        const aprxSqrt = this.n.ushrn(Math.floor(this.n.bitLength() / 2));
        // 3.74
        // Run EGCD, until r(L + 1) < aprxSqrt
        let u = lambda;
        let v = this.n.clone();
        let x1 = new BigNumber(1);
        let y1 = new BigNumber(0);
        let x2 = new BigNumber(0);
        let y2 = new BigNumber(1);
        // NOTE: all vectors are roots of: a + b * lambda = 0 (mod n)
        let a0;
        let b0;
        // First vector
        let a1;
        let b1;
        // Second vector
        let a2;
        let b2;
        let prevR;
        let i = 0;
        let r;
        let x;
        while (u.cmpn(0) !== 0) {
            const q = v.div(u);
            r = v.sub(q.mul(u));
            x = x2.sub(q.mul(x1));
            const y = y2.sub(q.mul(y1));
            if (typeof a1 !== 'object' && r.cmp(aprxSqrt) < 0) {
                a0 = prevR.neg();
                b0 = x1;
                a1 = r.neg();
                b1 = x;
            }
            else if (typeof a1 === 'object' && ++i === 2) {
                break;
            }
            prevR = r;
            v = u;
            u = r;
            x2 = x1;
            x1 = x;
            y2 = y1;
            y1 = y;
        }
        a2 = r.neg();
        b2 = x;
        const len1 = a1.sqr().add(b1.sqr());
        const len2 = a2.sqr().add(b2.sqr());
        if (len2.cmp(len1) >= 0) {
            a2 = a0;
            b2 = b0;
        }
        // Normalize signs
        if (a1.negative !== 0) {
            a1 = a1.neg();
            b1 = b1.neg();
        }
        if (a2.negative !== 0) {
            a2 = a2.neg();
            b2 = b2.neg();
        }
        return [
            { a: a1, b: b1 },
            { a: a2, b: b2 }
        ];
    }
    _endoSplit(k) {
        const basis = this.endo.basis;
        const v1 = basis[0];
        const v2 = basis[1];
        const c1 = v2.b.mul(k).divRound(this.n);
        const c2 = v1.b.neg().mul(k).divRound(this.n);
        const p1 = c1.mul(v1.a);
        const p2 = c2.mul(v2.a);
        const q1 = c1.mul(v1.b);
        const q2 = c2.mul(v2.b);
        // Calculate answer
        const k1 = k.sub(p1).sub(p2);
        const k2 = q1.add(q2).neg();
        return { k1, k2 };
    }
    validate(point) {
        if (point.inf) {
            return true;
        }
        const x = point.x;
        const y = point.y;
        const ax = this.a.redMul(x);
        const rhs = x.redSqr().redMul(x).redIAdd(ax).redIAdd(this.b);
        return y.redSqr().redISub(rhs).cmpn(0) === 0;
    }
    ;
}

/**
 * Represents a digital signature.
 *
 * A digital signature is a mathematical scheme for verifying the authenticity of
 * digital messages or documents. In many scenarios, it is equivalent to a handwritten signature or stamped seal.
 * The signature pair (R, S) corresponds to the raw ECDSA ([Elliptic Curve Digital Signature Algorithm](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)) signature.
 * Signatures are often serialized into a format known as '[DER encoding](https://en.wikipedia.org/wiki/X.690#DER_encoding)' for transmission.
 *
 * @class Signature
 */
class Signature {
    /**
     * @property Represents the "r" component of the digital signature
     */
    r;
    /**
     * @property Represents the "s" component of the digital signature
     */
    s;
    /**
     * Takes an array of numbers or a string and returns a new Signature instance.
     * This method will throw an error if the DER encoding is invalid.
     * If a string is provided, it is assumed to represent a hexadecimal sequence.
     *
     * @static
     * @method fromDER
     * @param data - The sequence to decode from DER encoding.
     * @param enc - The encoding of the data string.
     * @returns The decoded data in the form of Signature instance.
     *
     * @example
     * const signature = Signature.fromDER('30440220018c1f5502f8...', 'hex');
     */
    static fromDER(data, enc) {
        const getLength = (buf, p) => {
            const initial = buf[p.place++];
            if ((initial & 0x80) === 0) {
                return initial;
            }
            else {
                throw new Error('Invalid DER entity length');
            }
        };
        class Position {
            place;
            constructor() {
                this.place = 0;
            }
        }
        data = toArray(data, enc);
        const p = new Position();
        if (data[p.place++] !== 0x30) {
            throw new Error('Signature DER must start with 0x30');
        }
        const len = getLength(data, p);
        if ((len + p.place) !== data.length) {
            throw new Error('Signature DER invalid');
        }
        if (data[p.place++] !== 0x02) {
            throw new Error('Signature DER invalid');
        }
        const rlen = getLength(data, p);
        let r = data.slice(p.place, rlen + p.place);
        p.place += rlen;
        if (data[p.place++] !== 0x02) {
            throw new Error('Signature DER invalid');
        }
        const slen = getLength(data, p);
        if (data.length !== slen + p.place) {
            throw new Error('Invalid R-length in signature DER');
        }
        let s = data.slice(p.place, slen + p.place);
        if (r[0] === 0) {
            if ((r[1] & 0x80) !== 0) {
                r = r.slice(1);
            }
            else {
                throw new Error('Invalid R-value in signature DER');
            }
        }
        if (s[0] === 0) {
            if ((s[1] & 0x80) !== 0) {
                s = s.slice(1);
            }
            else {
                throw new Error('Invalid S-value in signature DER');
            }
        }
        return new Signature(new BigNumber(r), new BigNumber(s));
    }
    /**
     * Takes an array of numbers or a string and returns a new Signature instance.
     * This method will throw an error if the Compact encoding is invalid.
     * If a string is provided, it is assumed to represent a hexadecimal sequence.
     * compactByte value 27-30 means uncompressed public key.
     * 31-34 means compressed public key.
     * The range represents the recovery param which can be 0,1,2,3.
     * We could support recovery functions in future if there's demand.
     *
     * @static
     * @method fromCompact
     * @param data - The sequence to decode from Compact encoding.
     * @param enc - The encoding of the data string.
     * @returns The decoded data in the form of Signature instance.
     *
     * @example
     * const signature = Signature.fromCompact('1b18c1f5502f8...', 'hex');
     */
    static fromCompact(data, enc) {
        data = toArray(data, enc);
        if (data.length !== 65) {
            throw new Error('Invalid Compact Signature');
        }
        const compactByte = data[0];
        if (compactByte < 27 || compactByte >= 35) {
            throw new Error('Invalid Compact Byte');
        }
        return new Signature(new BigNumber(data.slice(1, 33)), new BigNumber(data.slice(33, 65)));
    }
    /**
     * Creates an instance of the Signature class.
     *
     * @constructor
     * @param r - The R component of the signature.
     * @param s - The S component of the signature.
     *
     * @example
     * const r = new BigNumber('208755674028...');
     * const s = new BigNumber('564745627577...');
     * const signature = new Signature(r, s);
     */
    constructor(r, s) {
        this.r = r;
        this.s = s;
    }
    /**
     * Verifies a digital signature.
     *
     * This method will return true if the signature, key, and message hash match.
     * If the data or key do not match the signature, the function returns false.
     *
     * @method verify
     * @param msg - The message to verify.
     * @param key - The public key used to sign the original message.
     * @param enc - The encoding of the msg string.
     * @returns A boolean representing whether the signature is valid.
     *
     * @example
     * const msg = 'The quick brown fox jumps over the lazy dog';
     * const publicKey = PublicKey.fromString('04188ca1050...');
     * const isVerified = signature.verify(msg, publicKey);
     */
    verify(msg, key, enc) {
        const msgHash = new BigNumber(sha256(msg, enc), 16);
        return verify$1(msgHash, this, key);
    }
    /**
     * Converts an instance of Signature into DER encoding.
     * An alias for the toDER method.
     *
     * If the encoding parameter is set to 'hex', the function will return a hex string.
     * If 'base64', it will return a base64 string.
     * Otherwise, it will return an array of numbers.
     *
     * @method toDER
     * @param enc - The encoding to use for the output.
     * @returns The current instance in DER encoding.
     *
     * @example
     * const der = signature.toString('base64');
     */
    toString(enc) {
        return this.toDER(enc);
    }
    /**
     * Converts an instance of Signature into DER encoding.
     *
     * If the encoding parameter is set to 'hex', the function will return a hex string.
     * If 'base64', it will return a base64 string.
     * Otherwise, it will return an array of numbers.
     *
     * @method toDER
     * @param enc - The encoding to use for the output.
     * @returns The current instance in DER encoding.
     *
     * @example
     * const der = signature.toDER('hex');
     */
    toDER(enc) {
        const constructLength = (arr, len) => {
            if (len < 0x80) {
                arr.push(len);
            }
            else {
                throw new Error('len must be < 0x80');
            }
        };
        const rmPadding = (buf) => {
            let i = 0;
            const len = buf.length - 1;
            while ((buf[i] === 0) && ((buf[i + 1] & 0x80) === 0) && i < len) {
                i++;
            }
            if (i === 0) {
                return buf;
            }
            return buf.slice(i);
        };
        let r = this.r.toArray();
        let s = this.s.toArray();
        // Pad values
        if ((r[0] & 0x80) !== 0) {
            r = [0].concat(r);
        }
        // Pad values
        if ((s[0] & 0x80) !== 0) {
            s = [0].concat(s);
        }
        r = rmPadding(r);
        s = rmPadding(s);
        while ((s[0] === 0) && (s[1] & 0x80) === 0) {
            s = s.slice(1);
        }
        let arr = [0x02];
        constructLength(arr, r.length);
        arr = arr.concat(r);
        arr.push(0x02);
        constructLength(arr, s.length);
        const backHalf = arr.concat(s);
        let res = [0x30];
        constructLength(res, backHalf.length);
        res = res.concat(backHalf);
        if (enc === 'hex') {
            return toHex(res);
        }
        else if (enc === 'base64') {
            return toBase64(res);
        }
        else {
            return res;
        }
    }
    /**
     * Converts an instance of Signature into Compact encoding.
     *
     * If the encoding parameter is set to 'hex', the function will return a hex string.
     * If 'base64', it will return a base64 string.
     * Otherwise, it will return an array of numbers.
     *
     * @method toCompact
     * @param enc - The encoding to use for the output.
     * @returns The current instance in DER encoding.
     *
     * @example
     * const compact = signature.toCompact(3, true, 'base64');
     */
    toCompact(recovery, compressed, enc) {
        if (recovery < 0 || recovery > 3)
            throw new Error('Invalid recovery param');
        if (typeof compressed !== 'boolean')
            throw new Error('Invalid compressed param');
        let compactByte = 27 + recovery;
        if (compressed) {
            compactByte += 4;
        }
        let arr = [compactByte];
        arr = arr.concat(this.r.toArray('be', 32));
        arr = arr.concat(this.s.toArray('be', 32));
        if (enc === 'hex') {
            return toHex(arr);
        }
        else if (enc === 'base64') {
            return toBase64(arr);
        }
        else {
            return arr;
        }
    }
    /**
     * Recovers the public key from a signature.
     * This method will return the public key if it finds a valid public key.
     * If it does not find a valid public key, it will throw an error.
     * The recovery factor is a number between 0 and 3.
     * @method RecoverPublicKey
     * @param recovery - The recovery factor.
     * @param e - The message hash.
     * @returns The public key associated with the signature.
     *
     * @example
     * const publicKey = signature.RecoverPublicKey(0, msgHash);
     */
    RecoverPublicKey(recovery, e) {
        const r = this.r;
        const s = this.s;
        // A set LSB signifies that the y-coordinate is odd
        const isYOdd = !!(recovery & 1);
        // The more significant bit specifies whether we should use the
        // first or second candidate key.
        const isSecondKey = recovery >> 1;
        const curve = new Curve();
        const n = curve.n;
        const G = curve.g;
        // 1.1 LEt x = r + jn
        const x = isSecondKey ? r.add(n) : r;
        const R = Point.fromX(x, isYOdd);
        // 1.4 Check that nR is at infinity
        const nR = R.mul(n);
        if (!nR.isInfinity()) {
            throw new Error('nR is not at infinity');
        }
        // Compute -e from e
        const eNeg = e.neg().umod(n);
        // 1.6.1 Compute Q = r^-1 (sR - eG)
        // Q = r^-1 (sR + -eG)
        const rInv = r.invm(n);
        // const Q = R.multiplyTwo(s, G, eNeg).mul(rInv)
        const srInv = rInv.mul(s).umod(n);
        const eInvrInv = rInv.mul(eNeg).umod(n);
        const Q = G.mul(eInvrInv).add(R.mul(srInv));
        const pubKey = new PublicKey(Q);
        pubKey.validate();
        return pubKey;
    }
    /**
     * Calculates the recovery factor which will work for a particular public key and message hash.
     * This method will return the recovery factor if it finds a valid recovery factor.
     * If it does not find a valid recovery factor, it will throw an error.
     * The recovery factor is a number between 0 and 3.
     *
     * @method CalculateRecoveryFactor
     * @param msgHash - The message hash.
     * @returns the recovery factor: number
     * /
     * @example
     * const recovery = signature.CalculateRecoveryFactor(publicKey, msgHash);
     */
    CalculateRecoveryFactor(pubkey, msgHash) {
        for (let recovery = 0; recovery < 4; recovery++) {
            let Qprime;
            try {
                Qprime = this.RecoverPublicKey(recovery, msgHash);
            }
            catch (e) {
                continue;
            }
            if (pubkey.eq(Qprime)) {
                return recovery;
            }
        }
        throw new Error('Unable to find valid recovery factor');
    }
}

/**
 * This class behaves as a HMAC-based deterministic random bit generator (DRBG). It implements a deterministic random number generator using SHA256HMAC HASH function. It takes an initial entropy and nonce when instantiated for seeding purpose.
 * @class DRBG
 *
 * @constructor
 * @param entropy - Initial entropy either in number array or hexadecimal string.
 * @param nonce - Initial nonce either in number array or hexadecimal string.
 *
 * @throws Throws an error message 'Not enough entropy. Minimum is 256 bits' when entropy's length is less than 32.
 *
 * @example
 * const drbg = new DRBG('af12de...', '123ef...');
 */
class DRBG {
    K;
    V;
    constructor(entropy, nonce) {
        entropy = toArray(entropy, 'hex');
        nonce = toArray(nonce, 'hex');
        if (entropy.length < 32) {
            throw new Error('Not enough entropy. Minimum is 256 bits');
        }
        const seed = entropy.concat(nonce);
        this.K = new Array(32);
        this.V = new Array(32);
        for (let i = 0; i < 32; i++) {
            this.K[i] = 0x00;
            this.V[i] = 0x01;
        }
        this.update(seed);
    }
    /**
     * Generates HMAC using the K value of the instance. This method is used internally for operations.
     *
     * @method hmac
     * @returns The SHA256HMAC object created with K value.
     *
     * @example
     * const hmac = drbg.hmac();
     */
    hmac() {
        return new SHA256HMAC(this.K);
    }
    /**
     * Updates the `K` and `V` values of the instance based on the seed.
     * The seed if not provided uses `V` as seed.
     *
     * @method update
     * @param seed - an optional value that used to update `K` and `V`. Default is `undefined`.
     * @returns Nothing, but updates the internal state `K` and `V` value.
     *
     * @example
     * drbg.update('e13af...');
     */
    update(seed) {
        let kmac = this.hmac()
            .update(this.V)
            .update([0x00]);
        if (seed !== undefined) {
            kmac = kmac.update(seed);
        }
        this.K = kmac.digest();
        this.V = this.hmac().update(this.V).digest();
        if (seed === undefined) {
            return;
        }
        this.K = this.hmac()
            .update(this.V)
            .update([0x01])
            .update(seed)
            .digest();
        this.V = this.hmac().update(this.V).digest();
    }
    /**
     * Generates deterministic random hexadecimal string of given length.
     * In every generation process, it also updates the internal state `K` and `V`.
     *
     * @method generate
     * @param len - The length of required random number.
     * @returns The required deterministic random hexadecimal string.
     *
     * @example
     * const randomHex = drbg.generate(256);
     */
    generate(len) {
        let temp = [];
        while (temp.length < len) {
            this.V = this.hmac().update(this.V).digest();
            temp = temp.concat(this.V);
        }
        const res = temp.slice(0, len);
        this.update();
        return toHex(res);
    }
}

/**
 * Truncates a BigNumber message to the length of the curve order n, in the context of the Elliptic Curve Digital Signature Algorithm (ECDSA).
 * This method is used as part of ECDSA signing and verification.
 *
 * The method calculates `delta`, which is a difference obtained by subtracting the bit length of the curve order `n` from the byte length of the message in bits.
 * If `delta` is greater than zero, logical shifts msg to the right by `delta`, retaining the sign.
 *
 * Another condition is tested, but only if `truncOnly` is false. This condition compares the value of msg to curve order `n`.
 * If msg is greater or equal to `n`, it is decreased by `n` and returned.
 *
 * @method truncateToN
 * @param msg - The BigNumber message to be truncated.
 * @param truncOnly - An optional boolean parameter that if set to true, the method will only perform truncation of the BigNumber without doing the additional subtraction from the curve order.
 * @returns Returns the truncated BigNumber value, potentially subtracted by the curve order n.
 *
 * @example
 * let msg = new BigNumber('1234567890abcdef', 16);
 * let truncatedMsg = truncateToN(msg);
 */
function truncateToN(msg, truncOnly, curve = new Curve()) {
    const delta = msg.byteLength() * 8 - curve.n.bitLength();
    if (delta > 0) {
        msg.iushrn(delta);
    }
    if (!truncOnly && msg.cmp(curve.n) >= 0) {
        return msg.sub(curve.n);
    }
    else {
        return msg;
    }
}
/**
 * Generates a digital signature for a given message.
 *
 * @function sign
 * @param msg - The BigNumber message for which the signature has to be computed.
 * @param key - Private key in BigNumber.
 * @param forceLowS - Optional boolean flag if True forces "s" to be the lower of two possible values.
 * @param customK - Optional specification for k value, which can be a function or BigNumber.
 * @returns Returns the elliptic curve digital signature of the message.
 *
 * @example
 * const msg = new BigNumber('2664878')
 * const key = new BigNumber('123456')
 * const signature = sign(msg, key)
 */
const sign$1 = (msg, key, forceLowS = false, customK) => {
    if (typeof BigInt === 'function') {
        // Curve parameters for secp256k1
        const zero = BigInt(0);
        const one = BigInt(1);
        const two = BigInt(2);
        const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'); // Order of the curve
        const p = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'); // Field prime
        const Gx = BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798');
        const Gy = BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8');
        const G = { x: Gx, y: Gy };
        // Convert msg and key to BigInt
        const z = BigInt('0x' + msg.toString(16));
        const d = BigInt('0x' + key.toString(16));
        // Validate private key
        if (d <= zero || d >= n) {
            throw new Error('Invalid private key');
        }
        // Helper function to convert BigInt to byte array
        function bigIntToBytes(value, length) {
            const hex = value.toString(16).padStart(length * 2, '0');
            const bytes = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
            }
            return bytes;
        }
        // Zero-extend key to provide enough entropy
        const bytes = 32; // Assuming 256-bit curve
        const bkey = bigIntToBytes(d, bytes); // 'd' is the private key BigInt
        // Zero-extend nonce to have the same byte size as N
        const nonce = bigIntToBytes(z, bytes); // 'z' is the message hash BigInt
        // Instantiate Hmac_DRBG
        const drbg = new DRBG(Array.from(bkey), Array.from(nonce));
        // Number of bytes to generate
        const ns1 = n - one;
        // Truncate to N function for BigInt
        function truncateToN(k, n, truncOnly = true) {
            const kBitLength = k.toString(2).length;
            const nBitLength = n.toString(2).length;
            const delta = kBitLength - nBitLength;
            if (delta > 0) {
                k = k >> BigInt(delta);
            }
            if (!truncOnly && k >= n) {
                return k - n;
            }
            else {
                return k;
            }
        }
        function generateK() {
            if (BigNumber.isBN(customK)) {
                // Use customK provided, convert to BigInt
                const k_str = customK.toString(16);
                return BigInt('0x' + k_str);
            }
            else {
                // Use DRBG to generate k
                const k_hex = drbg.generate(bytes); // Generate hex string
                return BigInt('0x' + k_hex);
            }
        }
        // Modular arithmetic functions
        function mod(a, m) {
            return ((a % m) + m) % m;
        }
        function modInv(a, m) {
            let lm = one;
            let hm = zero;
            let low = mod(a, m);
            let high = m;
            while (low > one) {
                const r = high / low;
                const nm = hm - lm * r;
                const neww = high - low * r;
                hm = lm;
                lm = nm;
                high = low;
                low = neww;
            }
            return mod(lm, m);
        }
        function pointAdd(P, Q) {
            if (P === null)
                return Q;
            if (Q === null)
                return P;
            if (P.x === Q.x && P.y === mod(-Q.y, p)) {
                return null; // Point at infinity
            }
            let m;
            if (P.x === Q.x && P.y === Q.y) {
                // Point doubling
                if (P.y === zero) {
                    return null; // Point at infinity
                }
                const numerator = mod(BigInt(3) * P.x * P.x, p); // 3 * x^2
                const denominator = modInv(two * P.y, p);
                m = mod(numerator * denominator, p);
            }
            else {
                const numerator = mod(Q.y - P.y, p);
                const denominator = modInv(Q.x - P.x, p);
                m = mod(numerator * denominator, p);
            }
            const xR = mod(m * m - P.x - Q.x, p);
            const yR = mod(m * (P.x - xR) - P.y, p);
            return { x: xR, y: yR };
        }
        function scalarMul(k, P) {
            let N = P;
            let Q = null; // Point at infinity
            while (k > zero) {
                if (k % two === one) {
                    Q = pointAdd(Q, N);
                }
                N = pointAdd(N, N);
                k >>= one;
            }
            return Q;
        }
        while (true) {
            let k = generateK();
            // Truncate k to n bits
            k = truncateToN(k, n, true);
            if (k <= one || k >= ns1) {
                if (customK instanceof BigNumber) {
                    throw new Error('Invalid fixed custom K value (must be more than 1 and less than N-1)');
                }
                else {
                    continue;
                }
            }
            const R = scalarMul(k, G);
            if (R === null) {
                if (customK instanceof BigNumber) {
                    throw new Error('Invalid fixed custom K value (must not create a point at infinity when multiplied by the generator point)');
                }
                else {
                    continue;
                }
            }
            const r = mod(R.x, n);
            if (r === zero) {
                if (customK instanceof BigNumber) {
                    throw new Error('Invalid fixed custom K value (when multiplied by G, the resulting x coordinate mod N must not be zero)');
                }
                else {
                    continue;
                }
            }
            const kInv = modInv(k, n);
            const rd = mod(r * d, n);
            let s = mod(kInv * (z + rd), n);
            if (s === zero) {
                if (customK instanceof BigNumber) {
                    throw new Error('Invalid fixed custom K value (when used with the key, it cannot create a zero value for S)');
                }
                else {
                    continue;
                }
            }
            // Use complement of `s` if it is > n / 2
            if (forceLowS && s > n / two) {
                s = n - s;
            }
            // Return signature as BigNumbers
            const r_bn = new BigNumber(r.toString(16), 16);
            const s_bn = new BigNumber(s.toString(16), 16);
            return new Signature(r_bn, s_bn);
        }
    }
    else {
        const curve = new Curve();
        msg = truncateToN(msg);
        // Zero-extend key to provide enough entropy
        const bytes = curve.n.byteLength();
        const bkey = key.toArray('be', bytes);
        // Zero-extend nonce to have the same byte size as N
        const nonce = msg.toArray('be', bytes);
        // Instantiate Hmac_DRBG
        const drbg = new DRBG(bkey, nonce);
        // Number of bytes to generate
        const ns1 = curve.n.subn(1);
        for (let iter = 0;; iter++) {
            // Compute the k-value
            let k = BigNumber.isBN(customK)
                    ? customK
                    : new BigNumber(drbg.generate(bytes), 16);
            k = truncateToN(k, true);
            if (k.cmpn(1) <= 0 || k.cmp(ns1) >= 0) {
                if (BigNumber.isBN(customK)) {
                    throw new Error('Invalid fixed custom K value (must be more than 1 and less than N-1)');
                }
                else {
                    continue;
                }
            }
            const kp = curve.g.mul(k);
            if (kp.isInfinity()) {
                if (BigNumber.isBN(customK)) {
                    throw new Error('Invalid fixed custom K value (must not create a point at infinity when multiplied by the generator point)');
                }
                else {
                    continue;
                }
            }
            const kpX = kp.getX();
            const r = kpX.umod(curve.n);
            if (r.cmpn(0) === 0) {
                if (BigNumber.isBN(customK)) {
                    throw new Error('Invalid fixed custom K value (when multiplied by G, the resulting x coordinate mod N must not be zero)');
                }
                else {
                    continue;
                }
            }
            let s = k.invm(curve.n).mul(r.mul(key).iadd(msg));
            s = s.umod(curve.n);
            if (s.cmpn(0) === 0) {
                if (BigNumber.isBN(customK)) {
                    throw new Error('Invalid fixed custom K value (when used with the key, it cannot create a zero value for S)');
                }
                else {
                    continue;
                }
            }
            // Use complement of `s`, if it is > `n / 2`
            if (forceLowS && s.cmp(curve.n.ushrn(1)) > 0) {
                s = curve.n.sub(s);
            }
            return new Signature(r, s);
        }
    }
};
/**
 * Verifies a digital signature of a given message.
 *
 * Message and key used during the signature generation process, and the previously computed signature
 * are used to validate the authenticity of the digital signature.
 *
 * @function verify
 * @param msg - The BigNumber message for which the signature has to be verified.
 * @param sig - Signature object consisting of parameters 'r' and 's'.
 * @param key - Public key in Point.
 * @returns Returns true if the signature is valid and false otherwise.
 *
 * @example
 * const msg = new BigNumber('2664878', 16)
 * const key = new Point(new BigNumber(10), new BigNumber(20)
 * const signature = sign(msg, new BigNumber('123456'))
 * const isVerified = verify(msg, sig, key)
 */
const verify$1 = (msg, sig, key) => {
    // Use BigInt for verification opportunistically
    if (typeof BigInt === 'function') {
        // Curve parameters for secp256k1
        const zero = BigInt(0);
        const one = BigInt(1);
        const two = BigInt(2);
        const three = BigInt(3);
        const p = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'); // Field prime
        const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'); // Order of the curve
        const G = {
            x: BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),
            y: BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8')
        };
        // Modular arithmetic functions
        const mod = (a, m) => ((a % m) + m) % m;
        const modInv = (a, m) => {
            // Extended Euclidean Algorithm for modular inverse
            let [old_r, r] = [a, m];
            let [old_s, s] = [BigInt(1), BigInt(0)];
            while (r !== zero) {
                const q = old_r / r;
                [old_r, r] = [r, old_r - q * r];
                [old_s, s] = [s, old_s - q * s];
            }
            if (old_r > one)
                return zero; // No inverse
            return mod(old_s, m);
        };
        const modMul = (a, b, m) => mod(a * b, m);
        const modSub = (a, b, m) => mod(a - b, m);
        // Define constants
        const four = BigInt(4);
        const eight = BigInt(8);
        // Point Doubling
        const pointDouble = (P) => {
            const { X: X1, Y: Y1, Z: Z1 } = P;
            if (Y1 === zero) {
                return { X: zero, Y: one, Z: zero }; // Point at infinity
            }
            const Y1_sq = modMul(Y1, Y1, p); // Y1^2
            const S = modMul(four, modMul(X1, Y1_sq, p), p); // S = 4 * X1 * Y1^2
            const M = modMul(three, modMul(X1, X1, p), p); // M = 3 * X1^2
            const X3 = modSub(modMul(M, M, p), modMul(two, S, p), p); // X3 = M^2 - 2 * S
            const Y3 = modSub(modMul(M, modSub(S, X3, p), p), modMul(eight, modMul(Y1_sq, Y1_sq, p), p), p); // Y3 = M * (S - X3) - 8 * Y1^4
            const Z3 = modMul(two, modMul(Y1, Z1, p), p); // Z3 = 2 * Y1 * Z1
            return { X: X3, Y: Y3, Z: Z3 };
        };
        // Point Addition
        const pointAdd = (P, Q) => {
            if (P.Z === zero)
                return Q;
            if (Q.Z === zero)
                return P;
            const Z1Z1 = modMul(P.Z, P.Z, p);
            const Z2Z2 = modMul(Q.Z, Q.Z, p);
            const U1 = modMul(P.X, Z2Z2, p);
            const U2 = modMul(Q.X, Z1Z1, p);
            const S1 = modMul(P.Y, modMul(Z2Z2, Q.Z, p), p);
            const S2 = modMul(Q.Y, modMul(Z1Z1, P.Z, p), p);
            const H = modSub(U2, U1, p);
            const r = modSub(S2, S1, p);
            if (H === zero) {
                if (r === zero) {
                    // P == Q
                    return pointDouble(P);
                }
                else {
                    // Point at infinity
                    return { X: zero, Y: one, Z: zero };
                }
            }
            const HH = modMul(H, H, p);
            const HHH = modMul(H, HH, p);
            const V = modMul(U1, HH, p);
            const X3 = modSub(modSub(modMul(r, r, p), HHH, p), modMul(two, V, p), p);
            const Y3 = modSub(modMul(r, modSub(V, X3, p), p), modMul(S1, HHH, p), p);
            const Z3 = modMul(H, modMul(P.Z, Q.Z, p), p);
            return { X: X3, Y: Y3, Z: Z3 };
        };
        // Scalar Multiplication
        const scalarMultiply = (k, P) => {
            const N = { X: P.x, Y: P.y, Z: one };
            let Q = { X: zero, Y: one, Z: zero }; // Point at infinity
            const kBin = k.toString(2);
            for (let i = 0; i < kBin.length; i++) {
                Q = pointDouble(Q);
                if (kBin[i] === '1') {
                    Q = pointAdd(Q, N);
                }
            }
            return Q;
        };
        // Verify Function Using Jacobian Coordinates
        const verifyECDSA = (hash, publicKey, signature) => {
            const { r, s } = signature;
            const z = hash;
            // Check r and s are in [1, n - 1]
            if (r <= zero || r >= n || s <= zero || s >= n) {
                return false;
            }
            const w = modInv(s, n); // w = s^-1 mod n
            if (w === zero) {
                return false; // No inverse exists
            }
            const u1 = modMul(z, w, n);
            const u2 = modMul(r, w, n);
            // Compute point R = u1 * G + u2 * Q
            const RG = scalarMultiply(u1, G);
            const RQ = scalarMultiply(u2, publicKey);
            const R = pointAdd(RG, RQ);
            if (R.Z === zero) {
                // Point at infinity
                return false;
            }
            // Compute affine x-coordinate x1 = X / Z^2 mod p
            const ZInv = modInv(R.Z, p);
            if (ZInv === zero) {
                return false; // No inverse exists
            }
            const ZInv2 = modMul(ZInv, ZInv, p);
            const x1_affine = modMul(R.X, ZInv2, p);
            // Compute v = x1_affine mod n
            const v = mod(x1_affine, n);
            // Signature is valid if v == r mod n
            return v === r;
        };
        // Convert inputs to BigInt
        const hash = BigInt('0x' + msg.toString(16));
        const publicKey = {
            x: BigInt('0x' + key.x.toString(16)),
            y: BigInt('0x' + key.y.toString(16))
        };
        const signature = {
            r: BigInt('0x' + sig.r.toString(16)),
            s: BigInt('0x' + sig.s.toString(16))
        };
        return verifyECDSA(hash, publicKey, signature);
    }
    else {
        const curve = new Curve();
        msg = truncateToN(msg);
        // Perform primitive values validation
        const r = sig.r;
        const s = sig.s;
        if (r.cmpn(1) < 0 || r.cmp(curve.n) >= 0) {
            return false;
        }
        if (s.cmpn(1) < 0 || s.cmp(curve.n) >= 0) {
            return false;
        }
        // Validate signature
        const sinv = s.invm(curve.n);
        const u1 = sinv.mul(msg).umod(curve.n);
        const u2 = sinv.mul(r).umod(curve.n);
        // NOTE: Greg Maxwell's trick, inspired by:
        // https://git.io/vad3K
        const p = curve.g.jmulAdd(u1, key, u2);
        if (p.isInfinity()) {
            return false;
        }
        // Compare `p.x` of Jacobian point with `r`,
        // this will do `p.x == r * p.z^2` instead of multiplying `p.x` by the
        // inverse of `p.z^2`
        return p.eqXToP(r);
    }
};

/**
 * The PublicKey class extends the Point class. It is used in public-key cryptography to derive shared secret, verify message signatures, and encode the public key in the DER format.
 * The class comes with static methods to generate PublicKey instances from private keys or from strings.
 *
 * @extends {Point}
 * @see {@link Point} for more information on Point.
 */
class PublicKey extends Point {
    /**
     * Static factory method to derive a public key from a private key.
     * It multiplies the generator point 'g' on the elliptic curve by the private key.
     *
     * @static
     * @method fromPrivateKey
     *
     * @param key - The private key from which to derive the public key.
     *
     * @returns Returns the PublicKey derived from the given PrivateKey.
     *
     * @example
     * const myPrivKey = new PrivateKey(...)
     * const myPubKey = PublicKey.fromPrivateKey(myPrivKey)
     */
    static fromPrivateKey(key) {
        const c = new Curve();
        const p = c.g.mul(key);
        return new PublicKey(p.x, p.y);
    }
    /**
     * Static factory method to create a PublicKey instance from a string.
     *
     * @param str - A string representing a public key.
     *
     * @returns Returns the PublicKey created from the string.
     *
     * @example
     * const myPubKey = PublicKey.fromString("03....")
     */
    static fromString(str) {
        const p = Point.fromString(str);
        return new PublicKey(p.x, p.y);
    }
    /**
     * Static factory method to create a PublicKey instance from a number array.
     *
     * @param bytes - A number array representing a public key.
     *
     * @returns Returns the PublicKey created from the number array.
     *
     * @example
     * const myPubKey = PublicKey.fromString("03....")
     */
    static fromDER(bytes) {
        const p = Point.fromDER(bytes);
        return new PublicKey(p.x, p.y);
    }
    /**
     * @constructor
     * @param x - A point or the x-coordinate of the point. May be a number, a BigNumber, a string (which will be interpreted as hex), a number array, or null. If null, an "Infinity" point is constructed.
     * @param y - If x is not a point, the y-coordinate of the point, similar to x.
     * @param isRed - A boolean indicating if the point is a member of the field of integers modulo the k256 prime. Default is true.
     *
     * @example
     * new PublicKey(point1);
     * new PublicKey('abc123', 'def456');
     */
    constructor(x, y = null, isRed = true) {
        if (x instanceof Point) {
            super(x.getX(), x.getY());
        }
        else {
            super(x, y, isRed);
        }
    }
    /**
     * Derive a shared secret from a public key and a private key for use in symmetric encryption.
     * This method multiplies the public key (an instance of Point) with a private key.
     *
     * @param priv - The private key to use in deriving the shared secret.
     *
     * @returns Returns the Point representing the shared secret.
     *
     * @throws Will throw an error if the public key is not valid for ECDH secret derivation.
     *
     * @example
     * const myPrivKey = new PrivateKey(...)
     * const sharedSecret = myPubKey.deriveSharedSecret(myPrivKey)
     */
    deriveSharedSecret(priv) {
        if (!this.validate()) {
            throw new Error('Public key not valid for ECDH secret derivation');
        }
        return this.mul(priv);
    }
    /**
     * Verify a signature of a message using this public key.
     *
     * @param msg - The message to verify. It can be a string or an array of numbers.
     * @param sig - The Signature of the message that needs verification.
     * @param enc - The encoding of the message. It defaults to 'utf8'.
     *
     * @returns Returns true if the signature is verified successfully, otherwise false.
     *
     * @example
     * const myMessage = "Hello, world!"
     * const mySignature = new Signature(...)
     * const isVerified = myPubKey.verify(myMessage, mySignature)
     */
    verify(msg, sig, enc) {
        const msgHash = new BigNumber(sha256(msg, enc), 16);
        return verify$1(msgHash, sig, this);
    }
    /**
     * Encode the public key to DER (Distinguished Encoding Rules) format.
     *
     * @returns Returns the DER-encoded public key in number array or string.
     *
     * @param enc - The encoding of the DER string. undefined = number array, 'hex' = hex string.
     *
     * @example
     * const derPublicKey = myPubKey.toDER()
     */
    toDER(enc) {
        if (enc === 'hex')
            return this.encode(true, enc);
        return this.encode(true);
    }
    /**
     * Hash sha256 and ripemd160 of the public key.
     *
     * @returns Returns the hash of the public key.
     *
     * @example
     * const publicKeyHash = pubkey.toHash()
     */
    toHash(enc) {
        const pkh = hash160(this.encode(true));
        if (enc === 'hex') {
            return toHex(pkh);
        }
        return pkh;
    }
    /**
     * Base58Check encodes the hash of the public key with a prefix to indicate locking script type.
     * Defaults to P2PKH for mainnet, otherwise known as a "Bitcoin Address".
     *
     * @param prefix defaults to [0x00] for mainnet, set to [0x6f] for testnet or use the strings 'mainnet' or 'testnet'
     *
     * @returns Returns the address encoding associated with the hash of the public key.
     *
     * @example
     * const address = pubkey.toAddress()
     * const address = pubkey.toAddress('mainnet')
     * const testnetAddress = pubkey.toAddress([0x6f])
     * const testnetAddress = pubkey.toAddress('testnet')
     */
    toAddress(prefix = [0x00]) {
        if (typeof prefix === 'string') {
            if (prefix === 'testnet' || prefix === 'test') {
                prefix = [0x6f];
            }
            else if (prefix === 'mainnet' || prefix === 'main') {
                prefix = [0x00];
            }
            else {
                throw new Error(`Invalid prefix ${prefix}`);
            }
        }
        return toBase58Check(this.toHash(), prefix);
    }
    /**
     * Derives a child key with BRC-42.
     * @param privateKey The private key of the other party
     * @param invoiceNumber The invoice number used to derive the child key
     * @returns The derived child key.
     */
    deriveChild(privateKey, invoiceNumber) {
        const sharedSecret = this.deriveSharedSecret(privateKey);
        const invoiceNumberBin = toArray(invoiceNumber, 'utf8');
        const hmac = sha256hmac(sharedSecret.encode(true), invoiceNumberBin);
        const curve = new Curve();
        const point = curve.g.mul(new BigNumber(hmac));
        const finalPoint = this.add(point);
        return new PublicKey(finalPoint.x, finalPoint.y);
    }
    /**
     * Takes an array of numbers or a string and returns a new PublicKey instance.
     * This method will throw an error if the Compact encoding is invalid.
     * If a string is provided, it is assumed to represent a hexadecimal sequence.
     * compactByte value 27-30 means uncompressed public key.
     * 31-34 means compressed public key.
     * The range represents the recovery param which can be 0,1,2,3.
     *
     * @static
     * @method fromMsgHashAndCompactSignature
     * @param msgHash - The message hash which was signed.
     * @param signature - The signature in compact format.
     * @param enc - The encoding of the signature string.
     * @returns A PublicKey instance derived from the message hash and compact signature.
     * @example
     * const publicKey = Signature.fromMsgHashAndCompactSignature(msgHash, 'IMOl2mVKfDgsSsHT4uIYBNN4e...', 'base64');
     */
    static fromMsgHashAndCompactSignature(msgHash, signature, enc) {
        const data = toArray(signature, enc);
        if (data.length !== 65) {
            throw new Error('Invalid Compact Signature');
        }
        const compactByte = data[0];
        if (compactByte < 27 || compactByte >= 35) {
            throw new Error('Invalid Compact Byte');
        }
        let r = data[0] - 27;
        if (r > 3) {
            r -= 4;
        }
        const s = new Signature(new BigNumber(data.slice(1, 33)), new BigNumber(data.slice(33, 65)));
        return s.RecoverPublicKey(r, msgHash);
    }
}

class Rand {
    _rand;
    constructor() {
        const noRand = () => {
            throw new Error('No secure random number generator is available in this environment.');
        };
        if (typeof self === 'object') {
            /* eslint-disable-next-line */
            if (self.crypto && self.crypto.getRandomValues) {
                this._rand = n => {
                    const arr = new Uint8Array(n);
                    /* eslint-disable-next-line */
                    self.crypto.getRandomValues(arr);
                    return [...arr];
                };
            }
            else /* if (typeof window === 'object') */ {
                this._rand = noRand;
            }
        }
        else {
            try {
                /* eslint-disable-next-line */
                const crypto = require('crypto');
                if (typeof crypto.randomBytes === 'function') {
                    this._rand = n => [...crypto.randomBytes(n)];
                }
            }
            catch (e) {
                this._rand = noRand;
            }
        }
    }
    generate(len) {
        return this._rand(len);
    }
}
let ayn = null;
/**
 * Generates a sequence of pseudo-random bytes with the given length.
 *
 * @param len - The number of bytes to generate
 *
 * @returns The generated bytes
 *
 * @example
 * import Random from '@bsv/sdk/primitives/Random'
 * const bytes = Random(32) // Produces 32 random bytes
 */
var Random = (len) => {
    if (ayn == null) {
        ayn = new Rand();
    }
    return ayn.generate(len);
};

class TransactionSignature extends Signature {
    static SIGHASH_ALL = 0x00000001;
    static SIGHASH_NONE = 0x00000002;
    static SIGHASH_SINGLE = 0x00000003;
    static SIGHASH_FORKID = 0x00000040;
    static SIGHASH_ANYONECANPAY = 0x00000080;
    scope;
    static format(params) {
        const currentInput = {
            sourceTXID: params.sourceTXID,
            sourceOutputIndex: params.sourceOutputIndex,
            sequence: params.inputSequence
        };
        const inputs = [...params.otherInputs];
        inputs.splice(params.inputIndex, 0, currentInput);
        const getPrevoutHash = () => {
            const writer = new Writer();
            for (const input of inputs) {
                if (typeof input.sourceTXID === 'undefined') {
                    writer.write(input.sourceTransaction.hash());
                }
                else {
                    writer.writeReverse(toArray(input.sourceTXID, 'hex'));
                }
                writer.writeUInt32LE(input.sourceOutputIndex);
            }
            const buf = writer.toArray();
            const ret = hash256(buf);
            return ret;
        };
        const getSequenceHash = () => {
            const writer = new Writer();
            for (const input of inputs) {
                writer.writeUInt32LE(input.sequence);
            }
            const buf = writer.toArray();
            const ret = hash256(buf);
            return ret;
        };
        function getOutputsHash(outputIndex) {
            const writer = new Writer();
            if (typeof outputIndex === 'undefined') {
                let script;
                for (const output of params.outputs) {
                    writer.writeUInt64LE(output.satoshis);
                    script = output.lockingScript.toBinary();
                    writer.writeVarIntNum(script.length);
                    writer.write(script);
                }
            }
            else {
                const output = params.outputs[outputIndex];
                writer.writeUInt64LE(output.satoshis);
                const script = output.lockingScript.toBinary();
                writer.writeVarIntNum(script.length);
                writer.write(script);
            }
            const buf = writer.toArray();
            const ret = hash256(buf);
            return ret;
        }
        let hashPrevouts = new Array(32).fill(0);
        let hashSequence = new Array(32).fill(0);
        let hashOutputs = new Array(32).fill(0);
        if ((params.scope & TransactionSignature.SIGHASH_ANYONECANPAY) === 0) {
            hashPrevouts = getPrevoutHash();
        }
        if ((params.scope & TransactionSignature.SIGHASH_ANYONECANPAY) === 0 &&
            (params.scope & 31) !== TransactionSignature.SIGHASH_SINGLE &&
            (params.scope & 31) !== TransactionSignature.SIGHASH_NONE) {
            hashSequence = getSequenceHash();
        }
        if ((params.scope & 31) !== TransactionSignature.SIGHASH_SINGLE && (params.scope & 31) !== TransactionSignature.SIGHASH_NONE) {
            hashOutputs = getOutputsHash();
        }
        else if ((params.scope & 31) === TransactionSignature.SIGHASH_SINGLE && params.inputIndex < params.outputs.length) {
            hashOutputs = getOutputsHash(params.inputIndex);
        }
        const writer = new Writer();
        // Version
        writer.writeInt32LE(params.transactionVersion);
        // Input prevouts/nSequence (none/all, depending on flags)
        writer.write(hashPrevouts);
        writer.write(hashSequence);
        //  outpoint (32-byte hash + 4-byte little endian)
        writer.writeReverse(toArray(params.sourceTXID, 'hex'));
        writer.writeUInt32LE(params.sourceOutputIndex);
        // scriptCode of the input (serialized as scripts inside CTxOuts)
        const subscriptBin = params.subscript.toBinary();
        writer.writeVarIntNum(subscriptBin.length);
        writer.write(subscriptBin);
        // value of the output spent by this input (8-byte little endian)
        writer.writeUInt64LE(params.sourceSatoshis);
        // nSequence of the input (4-byte little endian)
        const sequenceNumber = currentInput.sequence;
        writer.writeUInt32LE(sequenceNumber);
        // Outputs (none/one/all, depending on flags)
        writer.write(hashOutputs);
        // Locktime
        writer.writeUInt32LE(params.lockTime);
        // sighashType
        writer.writeUInt32LE(params.scope >>> 0);
        const buf = writer.toArray();
        return buf;
    }
    // The format used in a tx
    static fromChecksigFormat(buf) {
        if (buf.length === 0) {
            // allow setting a "blank" signature
            const r = new BigNumber(1);
            const s = new BigNumber(1);
            const scope = 1;
            return new TransactionSignature(r, s, scope);
        }
        const scope = buf[buf.length - 1];
        const derbuf = buf.slice(0, buf.length - 1);
        const tempSig = Signature.fromDER(derbuf);
        return new TransactionSignature(tempSig.r, tempSig.s, scope);
    }
    constructor(r, s, scope) {
        super(r, s);
        this.scope = scope;
    }
    /**
       * Compares to bitcoind's IsLowDERSignature
       * See also Ecdsa signature algorithm which enforces this.
       * See also Bip 62, "low S values in signatures"
       */
    hasLowS() {
        if (this.s.ltn(1) ||
            this.s.gt(new BigNumber('7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0', 'hex'))) {
            return false;
        }
        return true;
    }
    toChecksigFormat() {
        const derbuf = this.toDER();
        return [...derbuf, this.scope];
    }
}

/**
 * An object mapping opcode names (such as OP_DUP) to their corresponding numbers (such as 0x76), and vice versa.
 */
const OP = {
    // push value
    OP_FALSE: 0x00,
    OP_0: 0x00,
    OP_PUSHDATA1: 0x4c,
    OP_PUSHDATA2: 0x4d,
    OP_PUSHDATA4: 0x4e,
    OP_1NEGATE: 0x4f,
    OP_RESERVED: 0x50,
    OP_TRUE: 0x51,
    OP_1: 0x51,
    OP_2: 0x52,
    OP_3: 0x53,
    OP_4: 0x54,
    OP_5: 0x55,
    OP_6: 0x56,
    OP_7: 0x57,
    OP_8: 0x58,
    OP_9: 0x59,
    OP_10: 0x5a,
    OP_11: 0x5b,
    OP_12: 0x5c,
    OP_13: 0x5d,
    OP_14: 0x5e,
    OP_15: 0x5f,
    OP_16: 0x60,
    // control
    OP_NOP: 0x61,
    OP_VER: 0x62,
    OP_IF: 0x63,
    OP_NOTIF: 0x64,
    OP_VERIF: 0x65,
    OP_VERNOTIF: 0x66,
    OP_ELSE: 0x67,
    OP_ENDIF: 0x68,
    OP_VERIFY: 0x69,
    OP_RETURN: 0x6a,
    // stack ops
    OP_TOALTSTACK: 0x6b,
    OP_FROMALTSTACK: 0x6c,
    OP_2DROP: 0x6d,
    OP_2DUP: 0x6e,
    OP_3DUP: 0x6f,
    OP_2OVER: 0x70,
    OP_2ROT: 0x71,
    OP_2SWAP: 0x72,
    OP_IFDUP: 0x73,
    OP_DEPTH: 0x74,
    OP_DROP: 0x75,
    OP_DUP: 0x76,
    OP_NIP: 0x77,
    OP_OVER: 0x78,
    OP_PICK: 0x79,
    OP_ROLL: 0x7a,
    OP_ROT: 0x7b,
    OP_SWAP: 0x7c,
    OP_TUCK: 0x7d,
    // data manipulation ops
    OP_CAT: 0x7e,
    OP_SUBSTR: 0x7f, // Replaced in BSV
    OP_SPLIT: 0x7f,
    OP_LEFT: 0x80, // Replaced in BSV
    OP_NUM2BIN: 0x80,
    OP_RIGHT: 0x81, // Replaced in BSV
    OP_BIN2NUM: 0x81,
    OP_SIZE: 0x82,
    // bit logic
    OP_INVERT: 0x83,
    OP_AND: 0x84,
    OP_OR: 0x85,
    OP_XOR: 0x86,
    OP_EQUAL: 0x87,
    OP_EQUALVERIFY: 0x88,
    OP_RESERVED1: 0x89,
    OP_RESERVED2: 0x8a,
    // numeric
    OP_1ADD: 0x8b,
    OP_1SUB: 0x8c,
    OP_2MUL: 0x8d,
    OP_2DIV: 0x8e,
    OP_NEGATE: 0x8f,
    OP_ABS: 0x90,
    OP_NOT: 0x91,
    OP_0NOTEQUAL: 0x92,
    OP_ADD: 0x93,
    OP_SUB: 0x94,
    OP_MUL: 0x95,
    OP_DIV: 0x96,
    OP_MOD: 0x97,
    OP_LSHIFT: 0x98,
    OP_RSHIFT: 0x99,
    OP_BOOLAND: 0x9a,
    OP_BOOLOR: 0x9b,
    OP_NUMEQUAL: 0x9c,
    OP_NUMEQUALVERIFY: 0x9d,
    OP_NUMNOTEQUAL: 0x9e,
    OP_LESSTHAN: 0x9f,
    OP_GREATERTHAN: 0xa0,
    OP_LESSTHANOREQUAL: 0xa1,
    OP_GREATERTHANOREQUAL: 0xa2,
    OP_MIN: 0xa3,
    OP_MAX: 0xa4,
    OP_WITHIN: 0xa5,
    // crypto
    OP_RIPEMD160: 0xa6,
    OP_SHA1: 0xa7,
    OP_SHA256: 0xa8,
    OP_HASH160: 0xa9,
    OP_HASH256: 0xaa,
    OP_CODESEPARATOR: 0xab,
    OP_CHECKSIG: 0xac,
    OP_CHECKSIGVERIFY: 0xad,
    OP_CHECKMULTISIG: 0xae,
    OP_CHECKMULTISIGVERIFY: 0xaf,
    // expansion
    OP_NOP1: 0xb0,
    OP_NOP2: 0xb1,
    OP_NOP3: 0xb2,
    OP_NOP4: 0xb3,
    OP_NOP5: 0xb4,
    OP_NOP6: 0xb5,
    OP_NOP7: 0xb6,
    OP_NOP8: 0xb7,
    OP_NOP9: 0xb8,
    OP_NOP10: 0xb9,
    OP_NOP11: 0xba,
    OP_NOP12: 0xbb,
    OP_NOP13: 0xbc,
    OP_NOP14: 0xbd,
    OP_NOP15: 0xbe,
    OP_NOP16: 0xbf,
    OP_NOP17: 0xc0,
    OP_NOP18: 0xc1,
    OP_NOP19: 0xc2,
    OP_NOP20: 0xc3,
    OP_NOP21: 0xc4,
    OP_NOP22: 0xc5,
    OP_NOP23: 0xc6,
    OP_NOP24: 0xc7,
    OP_NOP25: 0xc8,
    OP_NOP26: 0xc9,
    OP_NOP27: 0xca,
    OP_NOP28: 0xcb,
    OP_NOP29: 0xcc,
    OP_NOP30: 0xcd,
    OP_NOP31: 0xce,
    OP_NOP32: 0xcf,
    OP_NOP33: 0xd0,
    OP_NOP34: 0xd1,
    OP_NOP35: 0xd2,
    OP_NOP36: 0xd3,
    OP_NOP37: 0xd4,
    OP_NOP38: 0xd5,
    OP_NOP39: 0xd6,
    OP_NOP40: 0xd7,
    OP_NOP41: 0xd8,
    OP_NOP42: 0xd9,
    OP_NOP43: 0xda,
    OP_NOP44: 0xdb,
    OP_NOP45: 0xdc,
    OP_NOP46: 0xdd,
    OP_NOP47: 0xde,
    OP_NOP48: 0xdf,
    OP_NOP49: 0xe0,
    OP_NOP50: 0xe1,
    OP_NOP51: 0xe2,
    OP_NOP52: 0xe3,
    OP_NOP53: 0xe4,
    OP_NOP54: 0xe5,
    OP_NOP55: 0xe6,
    OP_NOP56: 0xe7,
    OP_NOP57: 0xe8,
    OP_NOP58: 0xe9,
    OP_NOP59: 0xea,
    OP_NOP60: 0xeb,
    OP_NOP61: 0xec,
    OP_NOP62: 0xed,
    OP_NOP63: 0xee,
    OP_NOP64: 0xef,
    OP_NOP65: 0xf0,
    OP_NOP66: 0xf1,
    OP_NOP67: 0xf2,
    OP_NOP68: 0xf3,
    OP_NOP69: 0xf4,
    OP_NOP70: 0xf5,
    OP_NOP71: 0xf6,
    OP_NOP72: 0xf7,
    OP_NOP73: 0xf8,
    OP_NOP77: 0xfc,
    // template matching params
    OP_SMALLDATA: 0xf9,
    OP_SMALLINTEGER: 0xfa,
    OP_PUBKEYS: 0xfb,
    OP_PUBKEYHASH: 0xfd,
    OP_PUBKEY: 0xfe,
    OP_INVALIDOPCODE: 0xff
};
for (const name in OP) {
    OP[OP[name]] = name;
}

/**
 * The Script class represents a script in a Bitcoin SV transaction,
 * encapsulating the functionality to construct, parse, and serialize
 * scripts used in both locking (output) and unlocking (input) scripts.
 *
 * @property {ScriptChunk[]} chunks - An array of script chunks that make up the script.
 */
class Script {
    chunks;
    /**
     * @method fromASM
     * Static method to construct a Script instance from an ASM (Assembly) formatted string.
     * @param asm - The script in ASM string format.
     * @returns A new Script instance.
     * @example
     * const script = Script.fromASM("OP_DUP OP_HASH160 abcd... OP_EQUALVERIFY OP_CHECKSIG")
     */
    static fromASM(asm) {
        const chunks = [];
        const tokens = asm.split(' ');
        let i = 0;
        while (i < tokens.length) {
            const token = tokens[i];
            let opCode;
            let opCodeNum;
            if (token.startsWith('OP_') && typeof OP[token] !== 'undefined') {
                opCode = token;
                opCodeNum = OP[token];
            }
            // we start with two special cases, 0 and -1, which are handled specially in
            // toASM. see _chunkToString.
            if (token === '0') {
                opCodeNum = 0;
                chunks.push({
                    op: opCodeNum
                });
                i = i + 1;
            }
            else if (token === '-1') {
                opCodeNum = OP.OP_1NEGATE;
                chunks.push({
                    op: opCodeNum
                });
                i = i + 1;
            }
            else if (opCode === undefined) {
                let hex = tokens[i];
                if (hex.length % 2 !== 0) {
                    hex = '0' + hex;
                }
                const arr = toArray(hex, 'hex');
                if (encode(arr, 'hex') !== hex) {
                    throw new Error('invalid hex string in script');
                }
                const len = arr.length;
                if (len >= 0 && len < OP.OP_PUSHDATA1) {
                    opCodeNum = len;
                }
                else if (len < Math.pow(2, 8)) {
                    opCodeNum = OP.OP_PUSHDATA1;
                }
                else if (len < Math.pow(2, 16)) {
                    opCodeNum = OP.OP_PUSHDATA2;
                }
                else if (len < Math.pow(2, 32)) {
                    opCodeNum = OP.OP_PUSHDATA4;
                }
                chunks.push({
                    data: arr,
                    op: opCodeNum
                });
                i = i + 1;
            }
            else if (opCodeNum === OP.OP_PUSHDATA1 ||
                opCodeNum === OP.OP_PUSHDATA2 ||
                opCodeNum === OP.OP_PUSHDATA4) {
                chunks.push({
                    data: toArray(tokens[i + 2], 'hex'),
                    op: opCodeNum
                });
                i = i + 3;
            }
            else {
                chunks.push({
                    op: opCodeNum
                });
                i = i + 1;
            }
        }
        return new Script(chunks);
    }
    /**
     * @method fromHex
     * Static method to construct a Script instance from a hexadecimal string.
     * @param hex - The script in hexadecimal format.
     * @returns A new Script instance.
     * @example
     * const script = Script.fromHex("76a9...");
     */
    static fromHex(hex) {
        if (hex.length === 0)
            return Script.fromBinary([]);
        if (hex.length % 2 !== 0)
            throw new Error('There is an uneven number of characters in the string which suggests it is not hex encoded.');
        if (!/^[0-9a-fA-F]+$/.test(hex))
            throw new Error('Some elements in this string are not hex encoded.');
        return Script.fromBinary(toArray(hex, 'hex'));
    }
    /**
     * @method fromBinary
     * Static method to construct a Script instance from a binary array.
     * @param bin - The script in binary array format.
     * @returns A new Script instance.
     * @example
     * const script = Script.fromBinary([0x76, 0xa9, ...])
     */
    static fromBinary(bin) {
        bin = [...bin];
        const chunks = [];
        const br = new Reader(bin);
        while (!br.eof()) {
            const op = br.readUInt8();
            let len = 0;
            // eslint-disable-next-line @typescript-eslint/no-shadow
            let data = [];
            if (op > 0 && op < OP.OP_PUSHDATA1) {
                len = op;
                chunks.push({
                    data: br.read(len),
                    op
                });
            }
            else if (op === OP.OP_PUSHDATA1) {
                try {
                    len = br.readUInt8();
                    data = br.read(len);
                }
                catch (err) {
                    br.read();
                }
                chunks.push({
                    data,
                    op
                });
            }
            else if (op === OP.OP_PUSHDATA2) {
                try {
                    len = br.readUInt16LE();
                    data = br.read(len);
                }
                catch (err) {
                    br.read();
                }
                chunks.push({
                    data,
                    op
                });
            }
            else if (op === OP.OP_PUSHDATA4) {
                try {
                    len = br.readUInt32LE();
                    data = br.read(len);
                }
                catch (err) {
                    br.read();
                }
                chunks.push({
                    data,
                    op
                });
            }
            else {
                chunks.push({
                    op
                });
            }
        }
        return new Script(chunks);
    }
    /**
     * @constructor
     * Constructs a new Script object.
     * @param chunks=[] - An array of script chunks to directly initialize the script.
     */
    constructor(chunks = []) {
        this.chunks = chunks;
    }
    /**
     * @method toASM
     * Serializes the script to an ASM formatted string.
     * @returns The script in ASM string format.
     */
    toASM() {
        let str = '';
        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i];
            str += this._chunkToString(chunk);
        }
        return str.slice(1);
    }
    /**
     * @method toHex
     * Serializes the script to a hexadecimal string.
     * @returns The script in hexadecimal format.
     */
    toHex() {
        return encode(this.toBinary(), 'hex');
    }
    /**
     * @method toBinary
     * Serializes the script to a binary array.
     * @returns The script in binary array format.
     */
    toBinary() {
        const writer = new Writer();
        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i];
            const op = chunk.op;
            writer.writeUInt8(op);
            if (chunk.data) {
                if (op < OP.OP_PUSHDATA1) {
                    writer.write(chunk.data);
                }
                else if (op === OP.OP_PUSHDATA1) {
                    writer.writeUInt8(chunk.data.length);
                    writer.write(chunk.data);
                }
                else if (op === OP.OP_PUSHDATA2) {
                    writer.writeUInt16LE(chunk.data.length);
                    writer.write(chunk.data);
                }
                else if (op === OP.OP_PUSHDATA4) {
                    writer.writeUInt32LE(chunk.data.length);
                    writer.write(chunk.data);
                }
            }
        }
        return writer.toArray();
    }
    /**
     * @method writeScript
     * Appends another script to this script.
     * @param script - The script to append.
     * @returns This script instance for chaining.
     */
    writeScript(script) {
        this.chunks = this.chunks.concat(script.chunks);
        return this;
    }
    /**
     * @method writeOpCode
     * Appends an opcode to the script.
     * @param op - The opcode to append.
     * @returns This script instance for chaining.
     */
    writeOpCode(op) {
        this.chunks.push({ op });
        return this;
    }
    /**
     * @method setChunkOpCode
     * Sets the opcode of a specific chunk in the script.
     * @param i - The index of the chunk.
     * @param op - The opcode to set.
     * @returns This script instance for chaining.
     */
    setChunkOpCode(i, op) {
        this.chunks[i] = { op };
        return this;
    }
    /**
     * @method writeBn
    * Appends a BigNumber to the script as an opcode.
    * @param bn - The BigNumber to append.
    * @returns This script instance for chaining.
     */
    writeBn(bn) {
        if (bn.cmpn(0) === OP.OP_0) {
            this.chunks.push({
                op: OP.OP_0
            });
        }
        else if (bn.cmpn(-1) === 0) {
            this.chunks.push({
                op: OP.OP_1NEGATE
            });
        }
        else if (bn.cmpn(1) >= 0 && bn.cmpn(16) <= 0) {
            // see OP_1 - OP_16
            this.chunks.push({
                op: bn.toNumber() + OP.OP_1 - 1
            });
        }
        else {
            const buf = bn.toSm('little');
            this.writeBin(buf);
        }
        return this;
    }
    /**
     * @method writeBin
     * Appends binary data to the script, determining the appropriate opcode based on length.
     * @param bin - The binary data to append.
     * @returns This script instance for chaining.
     * @throws {Error} Throws an error if the data is too large to be pushed.
     */
    writeBin(bin) {
        let op;
        if (bin.length > 0 && bin.length < OP.OP_PUSHDATA1) {
            op = bin.length;
        }
        else if (bin.length === 0) {
            op = OP.OP_0;
        }
        else if (bin.length < Math.pow(2, 8)) {
            op = OP.OP_PUSHDATA1;
        }
        else if (bin.length < Math.pow(2, 16)) {
            op = OP.OP_PUSHDATA2;
        }
        else if (bin.length < Math.pow(2, 32)) {
            op = OP.OP_PUSHDATA4;
        }
        else {
            throw new Error("You can't push that much data");
        }
        this.chunks.push({
            data: bin,
            op
        });
        return this;
    }
    /**
     * @method writeNumber
     * Appends a number to the script.
     * @param num - The number to append.
     * @returns This script instance for chaining.
     */
    writeNumber(num) {
        this.writeBn(new BigNumber(num));
        return this;
    }
    /**
     * @method removeCodeseparators
     * Removes all OP_CODESEPARATOR opcodes from the script.
     * @returns This script instance for chaining.
     */
    removeCodeseparators() {
        const chunks = [];
        for (let i = 0; i < this.chunks.length; i++) {
            if (this.chunks[i].op !== OP.OP_CODESEPARATOR) {
                chunks.push(this.chunks[i]);
            }
        }
        this.chunks = chunks;
        return this;
    }
    /**
     * Deletes the given item wherever it appears in the current script.
     *
     * @param script - The script containing the item to delete from the current script.
     *
     * @returns This script instance for chaining.
     */
    findAndDelete(script) {
        const buf = script.toHex();
        for (let i = 0; i < this.chunks.length; i++) {
            const script2 = new Script([this.chunks[i]]);
            const buf2 = script2.toHex();
            if (buf === buf2) {
                this.chunks.splice(i, 1);
            }
        }
        return this;
    }
    /**
     * @method isPushOnly
     * Checks if the script contains only push data operations.
     * @returns True if the script is push-only, otherwise false.
     */
    isPushOnly() {
        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i];
            const opCodeNum = chunk.op;
            if (opCodeNum > OP.OP_16) {
                return false;
            }
        }
        return true;
    }
    /**
     * @method isLockingScript
     * Determines if the script is a locking script.
     * @returns True if the script is a locking script, otherwise false.
     */
    isLockingScript() {
        throw new Error('Not implemented');
    }
    /**
     * @method isUnlockingScript
     * Determines if the script is an unlocking script.
     * @returns True if the script is an unlocking script, otherwise false.
     */
    isUnlockingScript() {
        throw new Error('Not implemented');
    }
    /**
     * @private
     * @method _chunkToString
     * Converts a script chunk to its string representation.
     * @param chunk - The script chunk.
     * @returns The string representation of the chunk.
     */
    _chunkToString(chunk) {
        const op = chunk.op;
        let str = '';
        if (typeof chunk.data === 'undefined') {
            const val = OP[op];
            str = `${str} ${val}`;
        }
        else {
            str = `${str} ${toHex(chunk.data)}`;
        }
        return str;
    }
}

/**
 * The LockingScript class represents a locking script in a Bitcoin SV transaction.
 * It extends the Script class and is used specifically for output scripts that lock funds.
 *
 * Inherits all properties and methods from the Script class.
 *
 * @extends {Script}
 * @see {@link Script} for more information on Script.
 */
class LockingScript extends Script {
    /**
     * @method isLockingScript
     * Determines if the script is a locking script.
     * @returns {boolean} Always returns true for a LockingScript instance.
     */
    isLockingScript() {
        return true;
    }
    /**
     * @method isUnlockingScript
     * Determines if the script is an unlocking script.
     * @returns {boolean} Always returns false for a LockingScript instance.
     */
    isUnlockingScript() {
        return false;
    }
}

/**
 * The UnlockingScript class represents an unlocking script in a Bitcoin SV transaction.
 * It extends the Script class and is used specifically for input scripts that unlock funds.
 *
 * Inherits all properties and methods from the Script class.
 *
 * @extends {Script}
 * @see {@link Script} for more information on Script.
 */
class UnlockingScript extends Script {
    /**
     * @method isLockingScript
     * Determines if the script is a locking script.
     * @returns {boolean} Always returns false for an UnlockingScript instance.
     */
    isLockingScript() {
        return false;
    }
    /**
     * @method isUnlockingScript
     * Determines if the script is an unlocking script.
     * @returns {boolean} Always returns true for an UnlockingScript instance.
     */
    isUnlockingScript() {
        return true;
    }
}

// These constants control the current behavior of the interpreter.
// In the future, all of them will go away.
const maxScriptElementSize = 1024 * 1024 * 1024;
const maxMultisigKeyCount = Math.pow(2, 31) - 1;
const requireMinimalPush = true;
/**
 * The Spend class represents a spend action within a Bitcoin SV transaction.
 * It encapsulates all the necessary data required for spending a UTXO (Unspent Transaction Output)
 * and includes details about the source transaction, output, and the spending transaction itself.
 *
 * @property {string} sourceTXID - The transaction ID of the source UTXO.
 * @property {number} sourceOutputIndex - The index of the output in the source transaction.
 * @property {BigNumber} sourceSatoshis - The amount of satoshis in the source UTXO.
 * @property {LockingScript} lockingScript - The locking script associated with the UTXO.
 * @property {number} transactionVersion - The version of the current transaction.
 * @property {Array<{ sourceTXID: string, sourceOutputIndex: number, sequence: number }>} otherInputs -
 *           An array of other inputs in the transaction, each with a txid, outputIndex, and sequence number.
 * @property {Array<{ satoshis: BigNumber, lockingScript: LockingScript }>} outputs -
 *           An array of outputs of the current transaction, including the satoshi value and locking script for each.
 * @property {number} inputIndex - The index of this input in the current transaction.
 * @property {UnlockingScript} unlockingScript - The unlocking script that unlocks the UTXO for spending.
 * @property {number} inputSequence - The sequence number of this input.
 */
class Spend {
    sourceTXID;
    sourceOutputIndex;
    sourceSatoshis;
    lockingScript;
    transactionVersion;
    otherInputs;
    outputs;
    inputIndex;
    unlockingScript;
    inputSequence;
    lockTime;
    context;
    programCounter;
    lastCodeSeparator;
    stack;
    altStack;
    ifStack;
    /**
     * @constructor
     * Constructs the Spend object with necessary transaction details.
     * @param {string} params.sourceTXID - The transaction ID of the source UTXO.
     * @param {number} params.sourceOutputIndex - The index of the output in the source transaction.
     * @param {BigNumber} params.sourceSatoshis - The amount of satoshis in the source UTXO.
     * @param {LockingScript} params.lockingScript - The locking script associated with the UTXO.
     * @param {number} params.transactionVersion - The version of the current transaction.
     * @param {Array<{ sourceTXID: string, sourceOutputIndex: number, sequence: number }>} params.otherInputs -
     *        An array of other inputs in the transaction.
     * @param {Array<{ satoshis: BigNumber, lockingScript: LockingScript }>} params.outputs -
     *        The outputs of the current transaction.
     * @param {number} params.inputIndex - The index of this input in the current transaction.
     * @param {UnlockingScript} params.unlockingScript - The unlocking script for this spend.
     * @param {number} params.inputSequence - The sequence number of this input.
     * @param {number} params.lockTime - The lock time of the transaction.
     *
     * @example
     * const spend = new Spend({
     *   sourceTXID: "abcd1234", // sourceTXID
     *   sourceOutputIndex: 0, // sourceOutputIndex
     *   sourceSatoshis: new BigNumber(1000), // sourceSatoshis
     *   lockingScript: LockingScript.fromASM("OP_DUP OP_HASH160 abcd1234... OP_EQUALVERIFY OP_CHECKSIG"),
     *   transactionVersion: 1, // transactionVersion
     *   otherInputs: [{ sourceTXID: "abcd1234", sourceOutputIndex: 1, sequence: 0xffffffff }], // otherInputs
     *   outputs: [{ satoshis: new BigNumber(500), lockingScript: LockingScript.fromASM("OP_DUP...") }], // outputs
     *   inputIndex: 0, // inputIndex
     *   unlockingScript: UnlockingScript.fromASM("3045... 02ab..."),
     *   inputSequence: 0xffffffff // inputSequence
     * });
     */
    constructor(params) {
        this.sourceTXID = params.sourceTXID;
        this.sourceOutputIndex = params.sourceOutputIndex;
        this.sourceSatoshis = params.sourceSatoshis;
        this.lockingScript = params.lockingScript;
        this.transactionVersion = params.transactionVersion;
        this.otherInputs = params.otherInputs;
        this.outputs = params.outputs;
        this.inputIndex = params.inputIndex;
        this.unlockingScript = params.unlockingScript;
        this.inputSequence = params.inputSequence;
        this.lockTime = params.lockTime;
        this.reset();
    }
    reset() {
        this.context = 'UnlockingScript';
        this.programCounter = 0;
        this.lastCodeSeparator = null;
        this.stack = [];
        this.altStack = [];
        this.ifStack = [];
    }
    step() {
        // If the context is UnlockingScript and we have reached the end,
        // set the context to LockingScript and zero the program counter
        if (this.context === 'UnlockingScript' &&
            this.programCounter >= this.unlockingScript.chunks.length) {
            this.context = 'LockingScript';
            this.programCounter = 0;
        }
        let operation;
        if (this.context === 'UnlockingScript') {
            operation = this.unlockingScript.chunks[this.programCounter];
        }
        else {
            operation = this.lockingScript.chunks[this.programCounter];
        }
        const isOpcodeDisabled = (op) => {
            return op === OP.OP_2MUL ||
                op === OP.OP_2DIV ||
                op === OP.OP_VERIF ||
                op === OP.OP_VERNOTIF ||
                op === OP.OP_VER;
        };
        const isChunkMinimal = (chunk) => {
            const data = chunk.data;
            const op = chunk.op;
            if (!Array.isArray(data)) {
                return true;
            }
            if (data.length === 0) {
                // Could have used OP_0.
                return op === OP.OP_0;
            }
            else if (data.length === 1 && data[0] >= 1 && data[0] <= 16) {
                // Could have used OP_1 .. OP_16.
                return op === OP.OP_1 + (data[0] - 1);
            }
            else if (data.length === 1 && data[0] === 0x81) {
                // Could have used OP_1NEGATE.
                return op === OP.OP_1NEGATE;
            }
            else if (data.length <= 75) {
                // Could have used a direct push (opCode indicating number of bytes pushed + those bytes).
                return op === data.length;
            }
            else if (data.length <= 255) {
                // Could have used OP_PUSHDATA.
                return op === OP.OP_PUSHDATA1;
            }
            else if (data.length <= 65535) {
                // Could have used OP_PUSHDATA2.
                return op === OP.OP_PUSHDATA2;
            }
            return true;
        };
        // Following example from sCrypt now using Number.MAX_SAFE_INTEGER (bsv/lib/transaction/input/input.js).
        const isMinimallyEncoded = (buf, maxNumSize = Number.MAX_SAFE_INTEGER) => {
            if (buf.length > maxNumSize) {
                return false;
            }
            if (buf.length > 0) {
                // Check that the number is encoded with the minimum possible number
                // of bytes.
                //
                // If the most-significant-byte - excluding the sign bit - is zero
                // then we're not minimal. Note how this test also rejects the
                // negative-zero encoding, 0x80.
                if ((buf[buf.length - 1] & 0x7f) === 0) {
                    // One exception: if there's more than one byte and the most
                    // significant bit of the second-most-significant-byte is set it
                    // would conflict with the sign bit. An example of this case is
                    // +-255, which encode to 0xff00 and 0xff80 respectively.
                    // (big-endian).
                    if (buf.length <= 1 || (buf[buf.length - 2] & 0x80) === 0) {
                        return false;
                    }
                }
            }
            return true;
        };
        const padDataToSize = (buf, len) => {
            const b = buf;
            while (b.length < len) {
                b.unshift(0);
            }
            return b;
        };
        /**
         * This function is translated from bitcoind's IsDERSignature and is used in
         * the script interpreter.  This "DER" format actually includes an extra byte,
         * the nHashType, at the end. It is really the tx format, not DER format.
         *
         * A canonical signature exists of: [30] [total len] [02] [len R] [R] [02] [len S] [S] [hashtype]
         * Where R and S are not negative (their first byte has its highest bit not set), and not
         * excessively padded (do not start with a 0 byte, unless an otherwise negative number follows,
         * in which case a single 0 byte is necessary and even required).
         *
         * See https://bitcointalk.org/index.php?topic=8392.msg127623#msg127623
         */
        const isChecksigFormat = (buf) => {
            if (buf.length < 9) {
                //  Non-canonical signature: too short
                return false;
            }
            if (buf.length > 73) {
                // Non-canonical signature: too long
                return false;
            }
            if (buf[0] !== 0x30) {
                //  Non-canonical signature: wrong type
                return false;
            }
            if (buf[1] !== buf.length - 3) {
                //  Non-canonical signature: wrong length marker
                return false;
            }
            const nLEnR = buf[3];
            if (5 + nLEnR >= buf.length) {
                //  Non-canonical signature: S length misplaced
                return false;
            }
            const nLEnS = buf[5 + nLEnR];
            if (nLEnR + nLEnS + 7 !== buf.length) {
                //  Non-canonical signature: R+S length mismatch
                return false;
            }
            const R = buf.slice(4);
            if (buf[4 - 2] !== 0x02) {
                //  Non-canonical signature: R value type mismatch
                return false;
            }
            if (nLEnR === 0) {
                //  Non-canonical signature: R length is zero
                return false;
            }
            if ((R[0] & 0x80) !== 0) {
                //  Non-canonical signature: R value negative
                return false;
            }
            if (nLEnR > 1 && R[0] === 0x00 && (R[1] & 0x80) === 0) {
                //  Non-canonical signature: R value excessively padded
                return false;
            }
            const S = buf.slice(6 + nLEnR);
            if (buf[6 + nLEnR - 2] !== 0x02) {
                //  Non-canonical signature: S value type mismatch
                return false;
            }
            if (nLEnS === 0) {
                //  Non-canonical signature: S length is zero
                return false;
            }
            if ((S[0] & 0x80) !== 0) {
                //  Non-canonical signature: S value negative
                return false;
            }
            if (nLEnS > 1 && S[0] === 0x00 && (S[1] & 0x80) === 0) {
                //  Non-canonical signature: S value excessively padded
                return false;
            }
            return true;
        };
        const checkSignatureEncoding = (buf) => {
            // Empty signature. Not strictly DER encoded, but allowed to provide a
            // compact way to provide an invalid signature for use with CHECK(MULTI)SIG
            if (buf.length === 0) {
                return true;
            }
            if (!isChecksigFormat(buf)) {
                this.scriptEvaluationError('The signature format is invalid.');
            }
            const sig = TransactionSignature.fromChecksigFormat(buf);
            if (!sig.hasLowS()) {
                this.scriptEvaluationError('The signature must have a low S value.');
            }
            if ((sig.scope & TransactionSignature.SIGHASH_FORKID) === 0) {
                this.scriptEvaluationError('The signature must use SIGHASH_FORKID.');
                return false;
            }
            return true;
        };
        const checkPublicKeyEncoding = (buf) => {
            if (buf.length < 33) {
                this.scriptEvaluationError('The public key is too short, it must be at least 33 bytes.');
            }
            if (buf[0] === 0x04) {
                if (buf.length !== 65) {
                    this.scriptEvaluationError('The non-compressed public key must be 65 bytes.');
                }
            }
            else if ((buf[0] === 0x02 || buf[0] === 0x03)) {
                if (buf.length !== 33) {
                    this.scriptEvaluationError('The compressed public key must be 33 bytes.');
                }
            }
            else {
                this.scriptEvaluationError('The public key is in an unknown format.');
            }
            return true;
        };
        const verifySignature = (sig, pubkey, subscript) => {
            const preimage = TransactionSignature.format({
                sourceTXID: this.sourceTXID,
                sourceOutputIndex: this.sourceOutputIndex,
                sourceSatoshis: this.sourceSatoshis,
                transactionVersion: this.transactionVersion,
                otherInputs: this.otherInputs,
                outputs: this.outputs,
                inputIndex: this.inputIndex,
                subscript,
                inputSequence: this.inputSequence,
                lockTime: this.lockTime,
                scope: sig.scope
            });
            const hash = new BigNumber(hash256(preimage));
            return verify$1(hash, sig, pubkey);
        };
        const isScriptExecuting = !this.ifStack.includes(false);
        let buf, buf1, buf2, buf3, spliced, n, size, rawnum, num, signbit, x1, x2, x3, bn, bn1, bn2, bn3, bufSig, bufPubkey, subscript, bufHash;
        let sig, pubkey, i, fOk, nKeysCount, ikey, ikey2, nSigsCount, isig;
        let fValue, fEqual, fSuccess;
        // Read instruction
        const currentOpcode = operation.op;
        if (typeof currentOpcode === 'undefined') {
            this.scriptEvaluationError(`An opcode is missing in this chunk of the ${this.context}!`);
        }
        if (Array.isArray(operation.data) &&
            operation.data.length > maxScriptElementSize) {
            this.scriptEvaluationError(`It's not currently possible to push data larger than ${maxScriptElementSize} bytes.`);
        }
        if (isScriptExecuting && isOpcodeDisabled(currentOpcode)) {
            this.scriptEvaluationError('This opcode is currently disabled.');
        }
        if (isScriptExecuting && currentOpcode >= 0 &&
            currentOpcode <= OP.OP_PUSHDATA4) {
            if (!isChunkMinimal(operation)) {
                this.scriptEvaluationError('This data is not minimally-encoded.');
            }
            if (!Array.isArray(operation.data)) {
                this.stack.push([]);
            }
            else {
                this.stack.push(operation.data);
            }
        }
        else if (isScriptExecuting || (OP.OP_IF <= currentOpcode && currentOpcode <= OP.OP_ENDIF)) {
            switch (currentOpcode) {
                case OP.OP_1NEGATE:
                case OP.OP_1:
                case OP.OP_2:
                case OP.OP_3:
                case OP.OP_4:
                case OP.OP_5:
                case OP.OP_6:
                case OP.OP_7:
                case OP.OP_8:
                case OP.OP_9:
                case OP.OP_10:
                case OP.OP_11:
                case OP.OP_12:
                case OP.OP_13:
                case OP.OP_14:
                case OP.OP_15:
                case OP.OP_16:
                    n = currentOpcode - (OP.OP_1 - 1);
                    buf = new BigNumber(n).toScriptNum();
                    this.stack.push(buf);
                    break;
                case OP.OP_NOP:
                case OP.OP_NOP2:
                case OP.OP_NOP3:
                case OP.OP_NOP1:
                case OP.OP_NOP4:
                case OP.OP_NOP5:
                case OP.OP_NOP6:
                case OP.OP_NOP7:
                case OP.OP_NOP8:
                case OP.OP_NOP9:
                case OP.OP_NOP10:
                case OP.OP_NOP11:
                case OP.OP_NOP12:
                case OP.OP_NOP13:
                case OP.OP_NOP14:
                case OP.OP_NOP15:
                case OP.OP_NOP16:
                case OP.OP_NOP17:
                case OP.OP_NOP18:
                case OP.OP_NOP19:
                case OP.OP_NOP20:
                case OP.OP_NOP21:
                case OP.OP_NOP22:
                case OP.OP_NOP23:
                case OP.OP_NOP24:
                case OP.OP_NOP25:
                case OP.OP_NOP26:
                case OP.OP_NOP27:
                case OP.OP_NOP28:
                case OP.OP_NOP29:
                case OP.OP_NOP30:
                case OP.OP_NOP31:
                case OP.OP_NOP32:
                case OP.OP_NOP33:
                case OP.OP_NOP34:
                case OP.OP_NOP35:
                case OP.OP_NOP36:
                case OP.OP_NOP37:
                case OP.OP_NOP38:
                case OP.OP_NOP39:
                case OP.OP_NOP40:
                case OP.OP_NOP41:
                case OP.OP_NOP42:
                case OP.OP_NOP43:
                case OP.OP_NOP44:
                case OP.OP_NOP45:
                case OP.OP_NOP46:
                case OP.OP_NOP47:
                case OP.OP_NOP48:
                case OP.OP_NOP49:
                case OP.OP_NOP50:
                case OP.OP_NOP51:
                case OP.OP_NOP52:
                case OP.OP_NOP53:
                case OP.OP_NOP54:
                case OP.OP_NOP55:
                case OP.OP_NOP56:
                case OP.OP_NOP57:
                case OP.OP_NOP58:
                case OP.OP_NOP59:
                case OP.OP_NOP60:
                case OP.OP_NOP61:
                case OP.OP_NOP62:
                case OP.OP_NOP63:
                case OP.OP_NOP64:
                case OP.OP_NOP65:
                case OP.OP_NOP66:
                case OP.OP_NOP67:
                case OP.OP_NOP68:
                case OP.OP_NOP69:
                case OP.OP_NOP70:
                case OP.OP_NOP71:
                case OP.OP_NOP72:
                case OP.OP_NOP73:
                case OP.OP_NOP77:
                    break;
                case OP.OP_IF:
                case OP.OP_NOTIF:
                    fValue = false;
                    if (isScriptExecuting) {
                        if (this.stack.length < 1) {
                            this.scriptEvaluationError('OP_IF and OP_NOTIF require at least one item on the stack when they are used!');
                        }
                        buf = this.stacktop(-1);
                        fValue = this.castToBool(buf);
                        if (currentOpcode === OP.OP_NOTIF) {
                            fValue = !fValue;
                        }
                        this.stack.pop();
                    }
                    this.ifStack.push(fValue);
                    break;
                case OP.OP_ELSE:
                    if (this.ifStack.length === 0) {
                        this.scriptEvaluationError('OP_ELSE requires a preceeding OP_IF.');
                    }
                    this.ifStack[this.ifStack.length - 1] = !this.ifStack[this.ifStack.length - 1];
                    break;
                case OP.OP_ENDIF:
                    if (this.ifStack.length === 0) {
                        this.scriptEvaluationError('OP_ENDIF requires a preceeding OP_IF.');
                    }
                    this.ifStack.pop();
                    break;
                case OP.OP_VERIFY:
                    if (this.stack.length < 1) {
                        this.scriptEvaluationError('OP_VERIFY requires at least one item to be on the stack.');
                    }
                    buf = this.stacktop(-1);
                    fValue = this.castToBool(buf);
                    if (fValue) {
                        this.stack.pop();
                    }
                    else {
                        this.scriptEvaluationError('OP_VERIFY requires the top stack value to be truthy.');
                    }
                    break;
                case OP.OP_RETURN:
                    if (this.context === 'UnlockingScript') {
                        this.programCounter = this.unlockingScript.chunks.length;
                    }
                    else {
                        this.programCounter = this.lockingScript.chunks.length;
                    }
                    this.ifStack = [];
                    break;
                case OP.OP_TOALTSTACK:
                    if (this.stack.length < 1) {
                        this.scriptEvaluationError('OP_TOALTSTACK requires at oeast one item to be on the stack.');
                    }
                    this.altStack.push(this.stack.pop());
                    break;
                case OP.OP_FROMALTSTACK:
                    if (this.altStack.length < 1) {
                        this.scriptEvaluationError('OP_FROMALTSTACK requires at least one item to be on the stack.');
                    }
                    this.stack.push(this.altStack.pop());
                    break;
                case OP.OP_2DROP:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError('OP_2DROP requires at least two items to be on the stack.');
                    }
                    this.stack.pop();
                    this.stack.pop();
                    break;
                case OP.OP_2DUP:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError('OP_2DUP requires at least two items to be on the stack.');
                    }
                    buf1 = this.stacktop(-2);
                    buf2 = this.stacktop(-1);
                    this.stack.push([...buf1]);
                    this.stack.push([...buf2]);
                    break;
                case OP.OP_3DUP:
                    if (this.stack.length < 3) {
                        this.scriptEvaluationError('OP_3DUP requires at least three items to be on the stack.');
                    }
                    buf1 = this.stacktop(-3);
                    buf2 = this.stacktop(-2);
                    buf3 = this.stacktop(-1);
                    this.stack.push([...buf1]);
                    this.stack.push([...buf2]);
                    this.stack.push([...buf3]);
                    break;
                case OP.OP_2OVER:
                    if (this.stack.length < 4) {
                        this.scriptEvaluationError('OP_2OVER requires at least four items to be on the stack.');
                    }
                    buf1 = this.stacktop(-4);
                    buf2 = this.stacktop(-3);
                    this.stack.push([...buf1]);
                    this.stack.push([...buf2]);
                    break;
                case OP.OP_2ROT:
                    if (this.stack.length < 6) {
                        this.scriptEvaluationError('OP_2ROT requires at least six items to be on the stack.');
                    }
                    spliced = this.stack.splice(this.stack.length - 6, 2);
                    this.stack.push(spliced[0]);
                    this.stack.push(spliced[1]);
                    break;
                case OP.OP_2SWAP:
                    if (this.stack.length < 4) {
                        this.scriptEvaluationError('OP_2SWAP requires at least four items to be on the stack.');
                    }
                    spliced = this.stack.splice(this.stack.length - 4, 2);
                    this.stack.push(spliced[0]);
                    this.stack.push(spliced[1]);
                    break;
                case OP.OP_IFDUP:
                    if (this.stack.length < 1) {
                        this.scriptEvaluationError('OP_IFDUP requires at least one item to be on the stack.');
                    }
                    buf = this.stacktop(-1);
                    fValue = this.castToBool(buf);
                    if (fValue) {
                        this.stack.push([...buf]);
                    }
                    break;
                case OP.OP_DEPTH:
                    buf = new BigNumber(this.stack.length).toScriptNum();
                    this.stack.push(buf);
                    break;
                case OP.OP_DROP:
                    if (this.stack.length < 1) {
                        this.scriptEvaluationError('OP_DROP requires at least one item to be on the stack.');
                    }
                    this.stack.pop();
                    break;
                case OP.OP_DUP:
                    if (this.stack.length < 1) {
                        this.scriptEvaluationError('OP_DUP requires at least one item to be on the stack.');
                    }
                    this.stack.push([...this.stacktop(-1)]);
                    break;
                case OP.OP_NIP:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError('OP_NIP requires at least two items to be on the stack.');
                    }
                    this.stack.splice(this.stack.length - 2, 1);
                    break;
                case OP.OP_OVER:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError('OP_OVER requires at least two items to be on the stack.');
                    }
                    this.stack.push([...this.stacktop(-2)]);
                    break;
                case OP.OP_PICK:
                case OP.OP_ROLL:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires at least two items to be on the stack.`);
                    }
                    buf = this.stacktop(-1);
                    bn = BigNumber.fromScriptNum(buf, requireMinimalPush);
                    n = bn.toNumber();
                    this.stack.pop();
                    if (n < 0 || n >= this.stack.length) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires the top stack element to be 0 or a positive number less than the current size of the stack.`);
                    }
                    buf = this.stacktop(-n - 1);
                    if (currentOpcode === OP.OP_ROLL) {
                        this.stack.splice(this.stack.length - n - 1, 1);
                    }
                    this.stack.push([...buf]);
                    break;
                case OP.OP_ROT:
                    if (this.stack.length < 3) {
                        this.scriptEvaluationError('OP_ROT requires at least three items to be on the stack.');
                    }
                    x1 = this.stacktop(-3);
                    x2 = this.stacktop(-2);
                    x3 = this.stacktop(-1);
                    this.stack[this.stack.length - 3] = x2;
                    this.stack[this.stack.length - 2] = x3;
                    this.stack[this.stack.length - 1] = x1;
                    break;
                case OP.OP_SWAP:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError('OP_SWAP requires at least two items to be on the stack.');
                    }
                    x1 = this.stacktop(-2);
                    x2 = this.stacktop(-1);
                    this.stack[this.stack.length - 2] = x2;
                    this.stack[this.stack.length - 1] = x1;
                    break;
                case OP.OP_TUCK:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError('OP_TUCK requires at least two items to be on the stack.');
                    }
                    this.stack.splice(this.stack.length - 2, 0, [...this.stacktop(-1)]);
                    break;
                case OP.OP_SIZE:
                    if (this.stack.length < 1) {
                        this.scriptEvaluationError('OP_SIZE requires at least one item to be on the stack.');
                    }
                    bn = new BigNumber(this.stacktop(-1).length);
                    this.stack.push(bn.toScriptNum());
                    break;
                case OP.OP_AND:
                case OP.OP_OR:
                case OP.OP_XOR:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires at least one item to be on the stack.`);
                    }
                    buf1 = this.stacktop(-2);
                    buf2 = this.stacktop(-1);
                    if (buf1.length !== buf2.length) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires the top two stack items to be the same size.`);
                    }
                    switch (currentOpcode) {
                        case OP.OP_AND:
                            for (let i = 0; i < buf1.length; i++) {
                                buf1[i] &= buf2[i];
                            }
                            break;
                        case OP.OP_OR:
                            for (let i = 0; i < buf1.length; i++) {
                                buf1[i] |= buf2[i];
                            }
                            break;
                        case OP.OP_XOR:
                            for (let i = 0; i < buf1.length; i++) {
                                buf1[i] ^= buf2[i];
                            }
                            break;
                    }
                    // And pop vch2.
                    this.stack.pop();
                    break;
                case OP.OP_INVERT:
                    if (this.stack.length < 1) {
                        this.scriptEvaluationError('OP_INVERT requires at least one item to be on the stack.');
                    }
                    buf = this.stacktop(-1);
                    for (let i = 0; i < buf.length; i++) {
                        buf[i] = ~buf[i];
                    }
                    break;
                case OP.OP_LSHIFT:
                case OP.OP_RSHIFT:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires at least two items to be on the stack.`);
                    }
                    buf1 = this.stacktop(-2);
                    if (buf1.length === 0) {
                        this.stack.pop();
                    }
                    else {
                        bn1 = new BigNumber(buf1);
                        bn2 = BigNumber.fromScriptNum(this.stacktop(-1), requireMinimalPush);
                        n = bn2.toNumber();
                        if (n < 0) {
                            this.scriptEvaluationError(`${OP[currentOpcode]} requires the top item on the stack not to be negative.`);
                        }
                        this.stack.pop();
                        this.stack.pop();
                        let shifted;
                        if (currentOpcode === OP.OP_LSHIFT) {
                            shifted = bn1.ushln(n);
                        }
                        if (currentOpcode === OP.OP_RSHIFT) {
                            shifted = bn1.ushrn(n);
                        }
                        const bufShifted = padDataToSize(shifted.toArray().slice(buf1.length * -1), buf1.length);
                        this.stack.push(bufShifted);
                    }
                    break;
                case OP.OP_EQUAL:
                case OP.OP_EQUALVERIFY:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires at least two items to be on the stack.`);
                    }
                    buf1 = this.stacktop(-2);
                    buf2 = this.stacktop(-1);
                    fEqual = toHex(buf1) === toHex(buf2);
                    this.stack.pop();
                    this.stack.pop();
                    this.stack.push(fEqual ? [1] : []);
                    if (currentOpcode === OP.OP_EQUALVERIFY) {
                        if (fEqual) {
                            this.stack.pop();
                        }
                        else {
                            this.scriptEvaluationError('OP_EQUALVERIFY requires the top two stack items to be equal.');
                        }
                    }
                    break;
                case OP.OP_1ADD:
                case OP.OP_1SUB:
                case OP.OP_NEGATE:
                case OP.OP_ABS:
                case OP.OP_NOT:
                case OP.OP_0NOTEQUAL:
                    if (this.stack.length < 1) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires at least one items to be on the stack.`);
                    }
                    buf = this.stacktop(-1);
                    bn = BigNumber.fromScriptNum(buf, requireMinimalPush);
                    switch (currentOpcode) {
                        case OP.OP_1ADD:
                            bn = bn.addn(1);
                            break;
                        case OP.OP_1SUB:
                            bn = bn.subn(1);
                            break;
                        case OP.OP_NEGATE:
                            bn = bn.neg();
                            break;
                        case OP.OP_ABS:
                            if (bn.cmpn(0) < 0) {
                                bn = bn.neg();
                            }
                            break;
                        case OP.OP_NOT:
                            bn = new BigNumber((bn.cmpn(0) === 0) ? 1 : 0 + 0);
                            break;
                        case OP.OP_0NOTEQUAL:
                            bn = new BigNumber((bn.cmpn(0) !== 0) ? 1 : 0 + 0);
                            break;
                    }
                    this.stack.pop();
                    this.stack.push(bn.toScriptNum());
                    break;
                case OP.OP_ADD:
                case OP.OP_SUB:
                case OP.OP_MUL:
                case OP.OP_MOD:
                case OP.OP_DIV:
                case OP.OP_BOOLAND:
                case OP.OP_BOOLOR:
                case OP.OP_NUMEQUAL:
                case OP.OP_NUMEQUALVERIFY:
                case OP.OP_NUMNOTEQUAL:
                case OP.OP_LESSTHAN:
                case OP.OP_GREATERTHAN:
                case OP.OP_LESSTHANOREQUAL:
                case OP.OP_GREATERTHANOREQUAL:
                case OP.OP_MIN:
                case OP.OP_MAX:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires at least two items to be on the stack.`);
                    }
                    bn1 = BigNumber.fromScriptNum(this.stacktop(-2), requireMinimalPush);
                    bn2 = BigNumber.fromScriptNum(this.stacktop(-1), requireMinimalPush);
                    bn = new BigNumber(0);
                    switch (currentOpcode) {
                        case OP.OP_ADD:
                            bn = bn1.add(bn2);
                            break;
                        case OP.OP_SUB:
                            bn = bn1.sub(bn2);
                            break;
                        case OP.OP_MUL:
                            bn = bn1.mul(bn2);
                            break;
                        case OP.OP_DIV:
                            if (bn2.cmpn(0) === 0) {
                                this.scriptEvaluationError('OP_DIV cannot divide by zero!');
                            }
                            bn = bn1.div(bn2);
                            break;
                        case OP.OP_MOD:
                            if (bn2.cmpn(0) === 0) {
                                this.scriptEvaluationError('OP_MOD cannot divide by zero!');
                            }
                            bn = bn1.mod(bn2);
                            break;
                        case OP.OP_BOOLAND:
                            bn = new BigNumber(((bn1.cmpn(0) !== 0) && (bn2.cmpn(0) !== 0)) ? 1 : 0 + 0);
                            break;
                        case OP.OP_BOOLOR:
                            bn = new BigNumber(((bn1.cmpn(0) !== 0) || (bn2.cmpn(0) !== 0)) ? 1 : 0 + 0);
                            break;
                        case OP.OP_NUMEQUAL:
                            bn = new BigNumber((bn1.cmp(bn2) === 0) ? 1 : 0 + 0);
                            break;
                        case OP.OP_NUMEQUALVERIFY:
                            bn = new BigNumber((bn1.cmp(bn2) === 0) ? 1 : 0 + 0);
                            break;
                        case OP.OP_NUMNOTEQUAL:
                            bn = new BigNumber((bn1.cmp(bn2) !== 0) ? 1 : 0 + 0);
                            break;
                        case OP.OP_LESSTHAN:
                            bn = new BigNumber((bn1.cmp(bn2) < 0) ? 1 : 0 + 0);
                            break;
                        case OP.OP_GREATERTHAN:
                            bn = new BigNumber((bn1.cmp(bn2) > 0) ? 1 : 0 + 0);
                            break;
                        case OP.OP_LESSTHANOREQUAL:
                            bn = new BigNumber((bn1.cmp(bn2) <= 0) ? 1 : 0 + 0);
                            break;
                        case OP.OP_GREATERTHANOREQUAL:
                            bn = new BigNumber((bn1.cmp(bn2) >= 0) ? 1 : 0 + 0);
                            break;
                        case OP.OP_MIN:
                            bn = (bn1.cmp(bn2) < 0 ? bn1 : bn2);
                            break;
                        case OP.OP_MAX:
                            bn = (bn1.cmp(bn2) > 0 ? bn1 : bn2);
                            break;
                    }
                    this.stack.pop();
                    this.stack.pop();
                    this.stack.push(bn.toScriptNum());
                    if (currentOpcode === OP.OP_NUMEQUALVERIFY) {
                        if (this.castToBool(this.stacktop(-1))) {
                            this.stack.pop();
                        }
                        else {
                            this.scriptEvaluationError('OP_NUMEQUALVERIFY requires the top stack item to be truthy.');
                        }
                    }
                    break;
                case OP.OP_WITHIN:
                    if (this.stack.length < 3) {
                        this.scriptEvaluationError('OP_WITHIN requires at least three items to be on the stack.');
                    }
                    bn1 = BigNumber.fromScriptNum(this.stacktop(-3), requireMinimalPush);
                    bn2 = BigNumber.fromScriptNum(this.stacktop(-2), requireMinimalPush);
                    bn3 = BigNumber.fromScriptNum(this.stacktop(-1), requireMinimalPush);
                    fValue = (bn2.cmp(bn1) <= 0) && (bn1.cmp(bn3) < 0);
                    this.stack.pop();
                    this.stack.pop();
                    this.stack.pop();
                    this.stack.push(fValue ? [1] : []);
                    break;
                case OP.OP_RIPEMD160:
                case OP.OP_SHA1:
                case OP.OP_SHA256:
                case OP.OP_HASH160:
                case OP.OP_HASH256:
                    if (this.stack.length < 1) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires at least one item to be on the stack.`);
                    }
                    buf = this.stacktop(-1);
                    if (currentOpcode === OP.OP_RIPEMD160) {
                        bufHash = ripemd160(buf);
                    }
                    else if (currentOpcode === OP.OP_SHA1) {
                        bufHash = sha1(buf);
                    }
                    else if (currentOpcode === OP.OP_SHA256) {
                        bufHash = sha256(buf);
                    }
                    else if (currentOpcode === OP.OP_HASH160) {
                        bufHash = hash160(buf);
                    }
                    else if (currentOpcode === OP.OP_HASH256) {
                        bufHash = hash256(buf);
                    }
                    this.stack.pop();
                    this.stack.push(bufHash);
                    break;
                case OP.OP_CODESEPARATOR:
                    this.lastCodeSeparator = this.programCounter;
                    break;
                case OP.OP_CHECKSIG:
                case OP.OP_CHECKSIGVERIFY:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires at least two items to be on the stack.`);
                    }
                    bufSig = this.stacktop(-2);
                    bufPubkey = this.stacktop(-1);
                    if (!checkSignatureEncoding(bufSig) ||
                        !checkPublicKeyEncoding(bufPubkey)) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires correct encoding for the public key and signature.`);
                    }
                    // Subset of script starting at the most recent codeseparator
                    // CScript scriptCode(pbegincodehash, pend);
                    if (this.context === 'UnlockingScript') {
                        subscript = new Script(this.unlockingScript.chunks.slice(this.lastCodeSeparator));
                    }
                    else {
                        subscript = new Script(this.lockingScript.chunks.slice(this.lastCodeSeparator));
                    }
                    // Drop the signature, since there's no way for a signature to sign itself
                    subscript.findAndDelete(new Script().writeBin(bufSig));
                    try {
                        sig = TransactionSignature.fromChecksigFormat(bufSig);
                        pubkey = PublicKey.fromDER(bufPubkey);
                        fSuccess = verifySignature(sig, pubkey, subscript);
                    }
                    catch (e) {
                        // invalid sig or pubkey
                        fSuccess = false;
                    }
                    if (!fSuccess && bufSig.length > 0) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} failed to verify the signature, and requires an empty signature when verification fails.`);
                    }
                    this.stack.pop();
                    this.stack.pop();
                    // stack.push_back(fSuccess ? vchTrue : vchFalse);
                    this.stack.push(fSuccess ? [1] : []);
                    if (currentOpcode === OP.OP_CHECKSIGVERIFY) {
                        if (fSuccess) {
                            this.stack.pop();
                        }
                        else {
                            this.scriptEvaluationError('OP_CHECKSIGVERIFY requires that a valid signature is provided.');
                        }
                    }
                    break;
                case OP.OP_CHECKMULTISIG:
                case OP.OP_CHECKMULTISIGVERIFY:
                    i = 1;
                    if (this.stack.length < i) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires at least 1 item to be on the stack.`);
                    }
                    nKeysCount = BigNumber.fromScriptNum(this.stacktop(-i), requireMinimalPush).toNumber();
                    // TODO: Keys and opcount are parameterized in client. No magic numbers!
                    if (nKeysCount < 0 || nKeysCount > maxMultisigKeyCount) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires a key count between 0 and ${maxMultisigKeyCount}.`);
                    }
                    ikey = ++i;
                    i += nKeysCount;
                    // ikey2 is the position of last non-signature item in
                    // the stack. Top stack item = 1. With
                    // SCRIPT_VERIFY_NULLFAIL, this is used for cleanup if
                    // operation fails.
                    ikey2 = nKeysCount + 2;
                    if (this.stack.length < i) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires the number of stack items not to be less than the number of keys used.`);
                    }
                    nSigsCount = BigNumber.fromScriptNum(this.stacktop(-i), requireMinimalPush).toNumber();
                    if (nSigsCount < 0 || nSigsCount > nKeysCount) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires the number of signatures to be no greater than the number of keys.`);
                    }
                    isig = ++i;
                    i += nSigsCount;
                    if (this.stack.length < i) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires the number of stack items not to be less than the number of signatures provided.`);
                    }
                    // Subset of script starting at the most recent codeseparator
                    if (this.context === 'UnlockingScript') {
                        subscript = new Script(this.unlockingScript.chunks.slice(this.lastCodeSeparator));
                    }
                    else {
                        subscript = new Script(this.lockingScript.chunks.slice(this.lastCodeSeparator));
                    }
                    // Drop the signatures, since there's no way for a signature to sign itself
                    for (let k = 0; k < nSigsCount; k++) {
                        bufSig = this.stacktop(-isig - k);
                        subscript.findAndDelete(new Script().writeBin(bufSig));
                    }
                    fSuccess = true;
                    while (fSuccess && nSigsCount > 0) {
                        // valtype& vchSig  = this.stacktop(-isig);
                        bufSig = this.stacktop(-isig);
                        // valtype& vchPubKey = this.stacktop(-ikey);
                        bufPubkey = this.stacktop(-ikey);
                        if (!checkSignatureEncoding(bufSig) ||
                            !checkPublicKeyEncoding(bufPubkey)) {
                            this.scriptEvaluationError(`${OP[currentOpcode]} requires correct encoding for the public key and signature.`);
                        }
                        try {
                            sig = TransactionSignature.fromChecksigFormat(bufSig);
                            pubkey = PublicKey.fromString(toHex(bufPubkey));
                            fOk = verifySignature(sig, pubkey, subscript);
                        }
                        catch (e) {
                            // invalid sig or pubkey
                            fOk = false;
                        }
                        if (fOk) {
                            isig++;
                            nSigsCount--;
                        }
                        ikey++;
                        nKeysCount--;
                        // If there are more signatures left than keys left,
                        // then too many signatures have failed
                        if (nSigsCount > nKeysCount) {
                            fSuccess = false;
                        }
                    }
                    // Clean up stack of actual arguments
                    while (i-- > 1) {
                        if (!fSuccess && !ikey2 && (this.stacktop(-1).length > 0)) {
                            this.scriptEvaluationError(`${OP[currentOpcode]} failed to verify a signature, and requires an empty signature when verification fails.`);
                        }
                        if (ikey2 > 0) {
                            ikey2--;
                        }
                        this.stack.pop();
                    }
                    // A bug causes CHECKMULTISIG to consume one extra argument
                    // whose contents were not checked in any way.
                    //
                    // Unfortunately this is a potential source of mutability,
                    // so optionally verify it is exactly equal to zero prior
                    // to removing it from the stack.
                    if (this.stack.length < 1) {
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires an extra item to be on the stack.`);
                    }
                    if (this.stacktop(-1).length > 0) { // NOTE: Is this necessary? We don't care about malleability.
                        this.scriptEvaluationError(`${OP[currentOpcode]} requires the extra stack item to be empty.`);
                    }
                    this.stack.pop();
                    this.stack.push(fSuccess ? [1] : []);
                    if (currentOpcode === OP.OP_CHECKMULTISIGVERIFY) {
                        if (fSuccess) {
                            this.stack.pop();
                        }
                        else {
                            this.scriptEvaluationError('OP_CHECKMULTISIGVERIFY requires that a sufficient number of valid signatures are provided.');
                        }
                    }
                    break;
                case OP.OP_CAT:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError('OP_CAT requires at least two items to be on the stack.');
                    }
                    buf1 = this.stacktop(-2);
                    buf2 = this.stacktop(-1);
                    if (buf1.length + buf2.length > maxScriptElementSize) {
                        this.scriptEvaluationError(`It's not currently possible to push data larger than ${maxScriptElementSize} bytes.`);
                    }
                    this.stack[this.stack.length - 2] = [...buf1, ...buf2];
                    this.stack.pop();
                    break;
                case OP.OP_SPLIT:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError('OP_SPLIT requires at least two items to be on the stack.');
                    }
                    buf1 = this.stacktop(-2);
                    // Make sure the split point is apropriate.
                    n = BigNumber.fromScriptNum(this.stacktop(-1), requireMinimalPush).toNumber();
                    if (n < 0 || n > buf1.length) {
                        this.scriptEvaluationError('OP_SPLIT requires the first stack item to be a non-negative number less than or equal to the size of the second-from-top stack item.');
                    }
                    // Prepare the results in their own buffer as `data`
                    // will be invalidated.
                    // Copy buffer data, to slice it before
                    buf2 = [...buf1];
                    // Replace existing stack values by the new values.
                    this.stack[this.stack.length - 2] = buf2.slice(0, n);
                    this.stack[this.stack.length - 1] = buf2.slice(n);
                    break;
                case OP.OP_NUM2BIN:
                    if (this.stack.length < 2) {
                        this.scriptEvaluationError('OP_NUM2BIN requires at least two items to be on the stack.');
                    }
                    size = BigNumber.fromScriptNum(this.stacktop(-1), requireMinimalPush).toNumber();
                    if (size > maxScriptElementSize) {
                        this.scriptEvaluationError(`It's not currently possible to push data larger than ${maxScriptElementSize} bytes.`);
                    }
                    this.stack.pop();
                    rawnum = this.stacktop(-1);
                    // Try to see if we can fit that number in the number of
                    // byte requested.
                    rawnum = minimallyEncode(rawnum);
                    if (rawnum.length > size) {
                        this.scriptEvaluationError('OP_NUM2BIN requires that the size expressed in the top stack item is large enough to hold the value expressed in the second-from-top stack item.');
                    }
                    // We already have an element of the right size, we
                    // don't need to do anything.
                    if (rawnum.length === size) {
                        this.stack[this.stack.length - 1] = rawnum;
                        break;
                    }
                    signbit = 0x00;
                    if (rawnum.length > 0) {
                        signbit = rawnum[rawnum.length - 1] & 0x80;
                        rawnum[rawnum.length - 1] &= 0x7f;
                    }
                    num = new Array(size);
                    num.fill(0);
                    for (n = 0; n < size; n++) {
                        num[n] = rawnum[n];
                    }
                    n = rawnum.length - 1;
                    while (n++ < size - 2) {
                        num[n] = 0x00;
                    }
                    num[n] = signbit;
                    this.stack[this.stack.length - 1] = num;
                    break;
                case OP.OP_BIN2NUM:
                    if (this.stack.length < 1) {
                        this.scriptEvaluationError('OP_BIN2NUM requires at least one item to be on the stack.');
                    }
                    buf1 = this.stacktop(-1);
                    buf2 = minimallyEncode(buf1);
                    this.stack[this.stack.length - 1] = buf2;
                    // The resulting number must be a valid number.
                    if (!isMinimallyEncoded(buf2)) {
                        this.scriptEvaluationError('OP_BIN2NUM requires that the resulting number is valid.');
                    }
                    break;
                default:
                    this.scriptEvaluationError('Invalid opcode!');
            }
        }
        // Finally, increment the program counter
        this.programCounter++;
    }
    /**
     * @method validate
     * Validates the spend action by interpreting the locking and unlocking scripts.
     * @returns {boolean} Returns true if the scripts are valid and the spend is legitimate, otherwise false.
     * @example
     * if (spend.validate()) {
     *   console.log("Spend is valid!");
     * } else {
     *   console.log("Invalid spend!");
     * }
     */
    validate() {
        if (!this.unlockingScript.isPushOnly()) {
            this.scriptEvaluationError('Unlocking scripts can only contain push operations, and no other opcodes.');
        }
        while (true) {
            this.step();
            if (this.context === 'LockingScript' && this.programCounter >= this.lockingScript.chunks.length) {
                break;
            }
        }
        if (this.ifStack.length > 0) {
            this.scriptEvaluationError('Every OP_IF must be terminated prior to the end of the script.');
        }
        {
            if (this.stack.length !== 1) {
                this.scriptEvaluationError('The clean stack rule requires exactly one item to be on the stack after script execution.');
            }
        }
        if (!this.castToBool(this.stacktop(-1))) {
            this.scriptEvaluationError('The top stack element must be truthy after script evaluation.');
        }
        return true;
    }
    stacktop(i) {
        return this.stack[this.stack.length + i];
    }
    castToBool(val) {
        for (let i = 0; i < val.length; i++) {
            if (val[i] !== 0) {
                // can be negative zero
                if (i === val.length - 1 && val[i] === 0x80) {
                    return false;
                }
                return true;
            }
        }
        return false;
    }
    scriptEvaluationError(str) {
        throw new Error(`Script evaluation error: ${str}\n\nSource TXID: ${this.sourceTXID}\nSource output index: ${this.sourceOutputIndex}\nContext: ${this.context}\nProgram counter: ${this.programCounter}\nStack size: ${this.stack.length}\nAlt stack size: ${this.altStack.length}`);
    }
}

/**
 * P2PKH (Pay To Public Key Hash) class implementing ScriptTemplate.
 *
 * This class provides methods to create Pay To Public Key Hash locking and unlocking scripts, including the unlocking of P2PKH UTXOs with the private key.
 */
class P2PKH {
    /**
     * Creates a P2PKH locking script for a given public key hash or address string
     *
     * @param {number[] | string} pubkeyhash or address - An array or address representing the public key hash.
     * @returns {LockingScript} - A P2PKH locking script.
     */
    lock(pubkeyhash) {
        let data;
        if (typeof pubkeyhash === 'string') {
            const hash = fromBase58Check(pubkeyhash);
            if (hash.prefix[0] !== 0x00 && hash.prefix[0] !== 0x6f)
                throw new Error('only P2PKH is supported');
            data = hash.data;
        }
        else {
            data = pubkeyhash;
        }
        return new LockingScript([
            { op: OP.OP_DUP },
            { op: OP.OP_HASH160 },
            { op: data.length, data },
            { op: OP.OP_EQUALVERIFY },
            { op: OP.OP_CHECKSIG }
        ]);
    }
    /**
     * Creates a function that generates a P2PKH unlocking script along with its signature and length estimation.
     *
     * The returned object contains:
     * 1. `sign` - A function that, when invoked with a transaction and an input index,
     *    produces an unlocking script suitable for a P2PKH locked output.
     * 2. `estimateLength` - A function that returns the estimated length of the unlocking script in bytes.
     *
     * @param {PrivateKey} privateKey - The private key used for signing the transaction.
     * @param {'all'|'none'|'single'} signOutputs - The signature scope for outputs.
     * @param {boolean} anyoneCanPay - Flag indicating if the signature allows for other inputs to be added later.
     * @param {number} sourceSatoshis - Optional. The amount being unlocked. Otherwise the input.sourceTransaction is required.
     * @param {Script} lockingScript - Optional. The lockinScript. Otherwise the input.sourceTransaction is required.
     * @returns {Object} - An object containing the `sign` and `estimateLength` functions.
     */
    unlock(privateKey, signOutputs = 'all', anyoneCanPay = false, sourceSatoshis, lockingScript) {
        return {
            sign: async (tx, inputIndex) => {
                let signatureScope = TransactionSignature.SIGHASH_FORKID;
                if (signOutputs === 'all') {
                    signatureScope |= TransactionSignature.SIGHASH_ALL;
                }
                if (signOutputs === 'none') {
                    signatureScope |= TransactionSignature.SIGHASH_NONE;
                }
                if (signOutputs === 'single') {
                    signatureScope |= TransactionSignature.SIGHASH_SINGLE;
                }
                if (anyoneCanPay) {
                    signatureScope |= TransactionSignature.SIGHASH_ANYONECANPAY;
                }
                const input = tx.inputs[inputIndex];
                const otherInputs = tx.inputs.filter((_, index) => index !== inputIndex);
                const sourceTXID = input.sourceTXID ? input.sourceTXID : input.sourceTransaction?.id('hex');
                if (!sourceTXID) {
                    throw new Error('The input sourceTXID or sourceTransaction is required for transaction signing.');
                }
                sourceSatoshis ||= input.sourceTransaction?.outputs[input.sourceOutputIndex].satoshis;
                if (!sourceSatoshis) {
                    throw new Error('The sourceSatoshis or input sourceTransaction is required for transaction signing.');
                }
                lockingScript ||= input.sourceTransaction?.outputs[input.sourceOutputIndex].lockingScript;
                if (!lockingScript) {
                    throw new Error('The lockingScript or input sourceTransaction is required for transaction signing.');
                }
                const preimage = TransactionSignature.format({
                    sourceTXID,
                    sourceOutputIndex: input.sourceOutputIndex,
                    sourceSatoshis,
                    transactionVersion: tx.version,
                    otherInputs,
                    inputIndex,
                    outputs: tx.outputs,
                    inputSequence: input.sequence,
                    subscript: lockingScript,
                    lockTime: tx.lockTime,
                    scope: signatureScope
                });
                const rawSignature = privateKey.sign(sha256(preimage));
                const sig = new TransactionSignature(rawSignature.r, rawSignature.s, signatureScope);
                const sigForScript = sig.toChecksigFormat();
                const pubkeyForScript = privateKey.toPublicKey().encode(true);
                return new UnlockingScript([
                    { op: sigForScript.length, data: sigForScript },
                    { op: pubkeyForScript.length, data: pubkeyForScript }
                ]);
            },
            estimateLength: async () => {
                // public key (1+33) + signature (1+73)
                // Note: We add 1 to each element's length because of the associated OP_PUSH
                return 108;
            }
        };
    }
}

/**
 * Represents the "satoshis per kilobyte" transaction fee model.
 */
class SatoshisPerKilobyte {
    /**
     * @property
     * Denotes the number of satoshis paid per kilobyte of transaction size.
     */
    value;
    /**
     * Constructs an instance of the sat/kb fee model.
     *
     * @param {number} value - The number of satoshis per kilobyte to charge as a fee.
     */
    constructor(value) {
        this.value = value;
    }
    /**
     * Computes the fee for a given transaction.
     *
     * @param tx The transaction for which a fee is to be computed.
     * @returns The fee in satoshis for the transaction, as a BigNumber.
     */
    async computeFee(tx) {
        const getVarIntSize = (i) => {
            if (i > 2 ** 32) {
                return 9;
            }
            else if (i > 2 ** 16) {
                return 5;
            }
            else if (i > 253) {
                return 3;
            }
            else {
                return 1;
            }
        };
        // Compute the (potentially estimated) size of the transaction
        let size = 4; // version
        size += getVarIntSize(tx.inputs.length); // number of inputs
        for (let i = 0; i < tx.inputs.length; i++) {
            const input = tx.inputs[i];
            size += 40; // txid, output index, sequence number
            let scriptLength;
            if (typeof input.unlockingScript === 'object') {
                scriptLength = input.unlockingScript.toBinary().length;
            }
            else if (typeof input.unlockingScriptTemplate === 'object') {
                scriptLength = await input.unlockingScriptTemplate.estimateLength(tx, i);
            }
            else {
                throw new Error('All inputs must have an unlocking script or an unlocking script template for sat/kb fee computation.');
            }
            size += getVarIntSize(scriptLength); // unlocking script length
            size += scriptLength; // unlocking script
        }
        size += getVarIntSize(tx.outputs.length); // number of outputs
        for (const out of tx.outputs) {
            size += 8; // satoshis
            const length = out.lockingScript.toBinary().length;
            size += getVarIntSize(length); // script length
            size += length; // script
        }
        size += 4; // lock time
        // We'll use Math.ceil to ensure the miners get the extra satoshi.
        const fee = Math.ceil((size / 1000) * this.value);
        return fee;
    }
}

/**
 * Represents a Merkle Path, which is used to provide a compact proof of inclusion for a
 * transaction in a block. This class encapsulates all the details required for creating
 * and verifying Merkle Proofs.
 *
 * @class MerklePath
 * @property {number} blockHeight - The height of the block in which the transaction is included.
 * @property {Array<Array<{offset: number, hash?: string, txid?: boolean, duplicate?: boolean}>>} path -
 *           A tree structure representing the Merkle Path, with each level containing information
 *           about the nodes involved in constructing the proof.
 *
 * @example
 * // Creating and verifying a Merkle Path
 * const merklePath = MerklePath.fromHex('...');
 * const isValid = merklePath.verify(txid, chainTracker);
 *
 * @description
 * The MerklePath class is useful for verifying transactions in a lightweight and efficient manner without
 * needing the entire block data. This class offers functionalities for creating, converting,
 * and verifying these proofs.
 */
class MerklePath {
    blockHeight;
    path;
    /**
     * Creates a MerklePath instance from a hexadecimal string.
     *
     * @static
     * @param {string} hex - The hexadecimal string representation of the Merkle Path.
     * @returns {MerklePath} - A new MerklePath instance.
     */
    static fromHex(hex) {
        return MerklePath.fromBinary(toArray(hex, 'hex'));
    }
    static fromReader(reader) {
        const blockHeight = reader.readVarIntNum();
        const treeHeight = reader.readUInt8();
        const path = Array(treeHeight).fill(0).map(() => ([]));
        let flags, offset, nLeavesAtThisHeight;
        for (let level = 0; level < treeHeight; level++) {
            nLeavesAtThisHeight = reader.readVarIntNum();
            while (nLeavesAtThisHeight) {
                offset = reader.readVarIntNum();
                flags = reader.readUInt8();
                const leaf = { offset };
                if (flags & 1) {
                    leaf.duplicate = true;
                }
                else {
                    if (flags & 2) {
                        leaf.txid = true;
                    }
                    leaf.hash = toHex(reader.read(32).reverse());
                }
                path[level].push(leaf);
                nLeavesAtThisHeight--;
            }
            path[level].sort((a, b) => a.offset - b.offset);
        }
        return new MerklePath(blockHeight, path);
    }
    /**
     * Creates a MerklePath instance from a binary array.
     *
     * @static
     * @param {number[]} bump - The binary array representation of the Merkle Path.
     * @returns {MerklePath} - A new MerklePath instance.
     */
    static fromBinary(bump) {
        const reader = new Reader(bump);
        return MerklePath.fromReader(reader);
    }
    constructor(blockHeight, path) {
        this.blockHeight = blockHeight;
        this.path = path;
        // store all of the legal offsets which we expect given the txid indices.
        const legalOffsets = Array(this.path.length).fill(0).map(() => new Set());
        this.path.map((leaves, height) => {
            if (leaves.length === 0 && height === 0) {
                throw new Error(`Empty level at height: ${height}`);
            }
            const offsetsAtThisHeight = new Set();
            leaves.map(leaf => {
                if (offsetsAtThisHeight.has(leaf.offset))
                    throw new Error(`Duplicate offset: ${leaf.offset}, at height: ${height}`);
                offsetsAtThisHeight.add(leaf.offset);
                if (height === 0) {
                    if (!leaf.duplicate) {
                        for (let h = 1; h < this.path.length; h++) {
                            legalOffsets[h].add(leaf.offset >> h ^ 1);
                        }
                    }
                }
                else {
                    if (!legalOffsets[height].has(leaf.offset)) {
                        throw new Error(`Invalid offset: ${leaf.offset}, at height: ${height}, with legal offsets: ${Array.from(legalOffsets[height]).join(', ')}`);
                    }
                }
            });
        });
        let root;
        // every txid must calculate to the same root.
        this.path[0].map((leaf, idx) => {
            if (idx === 0)
                root = this.computeRoot(leaf.hash);
            if (root !== this.computeRoot(leaf.hash)) {
                throw new Error('Mismatched roots');
            }
        });
    }
    /**
     * Converts the MerklePath to a binary array format.
     *
     * @returns {number[]} - The binary array representation of the Merkle Path.
     */
    toBinary() {
        const writer = new Writer();
        writer.writeVarIntNum(this.blockHeight);
        const treeHeight = this.path.length;
        writer.writeUInt8(treeHeight);
        for (let level = 0; level < treeHeight; level++) {
            const nLeaves = Object.keys(this.path[level]).length;
            writer.writeVarIntNum(nLeaves);
            for (const leaf of this.path[level]) {
                writer.writeVarIntNum(leaf.offset);
                let flags = 0;
                if (leaf?.duplicate) {
                    flags |= 1;
                }
                if (leaf?.txid) {
                    flags |= 2;
                }
                writer.writeUInt8(flags);
                if ((flags & 1) === 0) {
                    writer.write(toArray(leaf.hash, 'hex').reverse());
                }
            }
        }
        return writer.toArray();
    }
    /**
     * Converts the MerklePath to a hexadecimal string format.
     *
     * @returns {string} - The hexadecimal string representation of the Merkle Path.
     */
    toHex() {
        return toHex(this.toBinary());
    }
    /**
     * Computes the Merkle root from the provided transaction ID.
     *
     * @param {string} txid - The transaction ID to compute the Merkle root for. If not provided, the root will be computed from an unspecified branch, and not all branches will be validated!
     * @returns {string} - The computed Merkle root as a hexadecimal string.
     * @throws {Error} - If the transaction ID is not part of the Merkle Path.
     */
    computeRoot(txid) {
        if (typeof txid !== 'string') {
            txid = this.path[0].find(leaf => Boolean(leaf?.hash)).hash;
        }
        // Find the index of the txid at the lowest level of the Merkle tree
        const index = this.path[0].find(l => l.hash === txid).offset;
        if (typeof index !== 'number') {
            throw new Error(`This proof does not contain the txid: ${txid}`);
        }
        // Calculate the root using the index as a way to determine which direction to concatenate.
        const hash = (m) => toHex((hash256(toArray(m, 'hex').reverse())).reverse());
        let workingHash = txid;
        for (let height = 0; height < this.path.length; height++) {
            this.path[height];
            const offset = index >> height ^ 1;
            const leaf = this.findOrComputeLeaf(height, offset);
            if (typeof leaf !== 'object') {
                throw new Error(`Missing hash for index ${index} at height ${height}`);
            }
            if (leaf.duplicate) {
                workingHash = hash(workingHash + workingHash);
            }
            else if (offset % 2 !== 0) {
                workingHash = hash(leaf.hash + workingHash);
            }
            else {
                workingHash = hash(workingHash + leaf.hash);
            }
        }
        return workingHash;
    }
    /**
     * Find leaf with `offset` at `height` or compute from level below, recursively.
     *
     * Does not add computed leaves to path.
     *
     * @param height
     * @param offset
     */
    findOrComputeLeaf(height, offset) {
        const hash = (m) => toHex((hash256(toArray(m, 'hex').reverse())).reverse());
        let leaf = this.path[height].find(l => l.offset === offset);
        if (leaf)
            return leaf;
        if (height === 0)
            return undefined;
        const h = height - 1;
        const l = offset << 1;
        const leaf0 = this.findOrComputeLeaf(h, l);
        if (!leaf0 || !leaf0.hash)
            return undefined;
        const leaf1 = this.findOrComputeLeaf(h, l + 1);
        if (!leaf1)
            return undefined;
        let workinghash;
        if (leaf1.duplicate) {
            workinghash = hash(leaf0.hash + leaf0.hash);
        }
        else {
            workinghash = hash(leaf1.hash + leaf0.hash);
        }
        leaf = {
            offset,
            hash: workinghash
        };
        return leaf;
    }
    /**
     * Verifies if the given transaction ID is part of the Merkle tree at the specified block height.
     *
     * @param {string} txid - The transaction ID to verify.
     * @param {ChainTracker} chainTracker - The ChainTracker instance used to verify the Merkle root.
     * @returns {boolean} - True if the transaction ID is valid within the Merkle Path at the specified block height.
     */
    async verify(txid, chainTracker) {
        const root = this.computeRoot(txid);
        // Use the chain tracker to determine whether this is a valid merkle root at the given block height
        return await chainTracker.isValidRootForHeight(root, this.blockHeight);
    }
    /**
     * Combines this MerklePath with another to create a compound proof.
     *
     * @param {MerklePath} other - Another MerklePath to combine with this path.
     * @throws {Error} - If the paths have different block heights or roots.
     */
    combine(other) {
        if (this.blockHeight !== other.blockHeight) {
            throw new Error('You cannot combine paths which do not have the same block height.');
        }
        const root1 = this.computeRoot();
        const root2 = other.computeRoot();
        if (root1 !== root2) {
            throw new Error('You cannot combine paths which do not have the same root.');
        }
        const combinedPath = [];
        for (let h = 0; h < this.path.length; h++) {
            combinedPath.push([]);
            for (let l = 0; l < this.path[h].length; l++) {
                combinedPath[h].push(this.path[h][l]);
            }
            for (let l = 0; l < other.path[h].length; l++) {
                if (!combinedPath[h].find(leaf => leaf.offset === other.path[h][l].offset)) {
                    combinedPath[h].push(other.path[h][l]);
                }
                else {
                    // Ensure that any elements which appear in both are not downgraded to a non txid.
                    if (other.path[h][l]?.txid) {
                        const target = combinedPath[h].find(leaf => leaf.offset === other.path[h][l].offset);
                        target.txid = true;
                    }
                }
            }
        }
        this.path = combinedPath;
        this.trim();
    }
    /**
     * Remove all internal nodes that are not required by level zero txid nodes.
     * Assumes that at least all required nodes are present.
     * Leaves all levels sorted by increasing offset.
     */
    trim() {
        const pushIfNew = (v, a) => {
            if (a.length === 0 || a.slice(-1)[0] !== v) {
                a.push(v);
            }
        };
        const dropOffsetsFromLevel = (dropOffsets, level) => {
            for (let i = dropOffsets.length; i >= 0; i--) {
                const l = this.path[level].findIndex(n => n.offset === dropOffsets[i]);
                if (l >= 0) {
                    this.path[level].splice(l, 1);
                }
            }
        };
        const nextComputedOffsets = (cos) => {
            const ncos = [];
            for (const o of cos) {
                pushIfNew(o >> 1, ncos);
            }
            return ncos;
        };
        let computedOffsets = []; // in next level
        let dropOffsets = [];
        for (let h = 0; h < this.path.length; h++) {
            // Sort each level by increasing offset order
            this.path[h].sort((a, b) => a.offset - b.offset);
        }
        for (let l = 0; l < this.path[0].length; l++) {
            const n = this.path[0][l];
            if (n.txid) {
                // level 0 must enable computing level 1 for txid nodes
                pushIfNew(n.offset >> 1, computedOffsets);
            }
            else {
                const isOdd = n.offset % 2 === 1;
                const peer = this.path[0][l + (isOdd ? -1 : 1)];
                if (!peer.txid) {
                    // drop non-txid level 0 nodes without a txid peer
                    pushIfNew(peer.offset, dropOffsets);
                }
            }
        }
        dropOffsetsFromLevel(dropOffsets, 0);
        for (let h = 1; h < this.path.length; h++) {
            dropOffsets = computedOffsets;
            computedOffsets = nextComputedOffsets(computedOffsets);
            dropOffsetsFromLevel(dropOffsets, h);
        }
    }
}

/**
 * Adapter for Node.js Https module to be used as HttpClient
 */
class NodejsHttpClient {
    https;
    constructor(https) {
        this.https = https;
    }
    async request(url, requestOptions) {
        return await new Promise((resolve, reject) => {
            const req = this.https.request(url, requestOptions, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    const ok = res.statusCode >= 200 && res.statusCode <= 299;
                    const mediaType = res.headers['content-type'];
                    const data = body && mediaType.startsWith('application/json') ? JSON.parse(body) : body;
                    resolve({
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        ok,
                        data
                    });
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            if (requestOptions.data) {
                req.write(JSON.stringify(requestOptions.data));
            }
            req.end();
        });
    }
}

/**
 * Adapter for Node.js Https module to be used as HttpClient
 */
class FetchHttpClient {
    fetch;
    constructor(fetch) {
        this.fetch = fetch;
    }
    async request(url, options) {
        const fetchOptions = {
            method: options.method,
            headers: options.headers,
            body: JSON.stringify(options.data)
        };
        const res = await this.fetch(url, fetchOptions);
        const mediaType = res.headers.get('Content-Type');
        const data = mediaType.startsWith('application/json') ? await res.json() : await res.text();
        return {
            ok: res.ok,
            status: res.status,
            statusText: res.statusText,
            data: data
        };
    }
}

/**
 * Returns a default HttpClient implementation based on the environment that it is run on.
 * This method will attempt to use `window.fetch` if available (in browser environments).
 * If running in a Node.js environment, it falls back to using the Node.js `https` module
 */
function defaultHttpClient() {
    const noHttpClient = {
        async request(..._) {
            throw new Error('No method available to perform HTTP request');
        }
    };
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        // Use fetch in a browser environment
        return new FetchHttpClient(window.fetch);
    }
    else if (typeof require !== 'undefined') {
        // Use Node.js https module
        // eslint-disable-next-line
        try {
            const https = require('https');
            return new NodejsHttpClient(https);
        }
        catch (e) {
            return noHttpClient;
        }
    }
    else {
        return noHttpClient;
    }
}

function defaultDeploymentId() {
    return `ts-sdk-${toHex(Random(16))}`;
}
/**
 * Represents an ARC transaction broadcaster.
 */
class ARC {
    URL;
    apiKey;
    deploymentId;
    callbackUrl;
    callbackToken;
    headers;
    httpClient;
    constructor(URL, config) {
        this.URL = URL;
        if (typeof config === 'string') {
            this.apiKey = config;
            this.httpClient = defaultHttpClient();
            this.deploymentId = defaultDeploymentId();
            this.callbackToken = undefined;
            this.callbackUrl = undefined;
        }
        else {
            const { apiKey, deploymentId, httpClient, callbackToken, callbackUrl, headers } = config ?? {};
            this.apiKey = apiKey;
            this.httpClient = httpClient ?? defaultHttpClient();
            this.deploymentId = deploymentId ?? defaultDeploymentId();
            this.callbackToken = callbackToken;
            this.callbackUrl = callbackUrl;
            this.headers = headers;
        }
    }
    /**
     * Broadcasts a transaction via ARC.
     *
     * @param {Transaction} tx - The transaction to be broadcasted.
     * @returns {Promise<BroadcastResponse | BroadcastFailure>} A promise that resolves to either a success or failure response.
     */
    async broadcast(tx) {
        let rawTx;
        try {
            rawTx = tx.toHexEF();
        }
        catch (error) {
            if (error.message === 'All inputs must have source transactions when serializing to EF format') {
                rawTx = tx.toHex();
            }
            else {
                throw error;
            }
        }
        const requestOptions = {
            method: 'POST',
            headers: this.requestHeaders(),
            data: { rawTx }
        };
        try {
            const response = await this.httpClient.request(`${this.URL}/v1/tx`, requestOptions);
            if (response.ok) {
                const { txid, extraInfo, txStatus, competingTxs } = response.data;
                let broadcastRes = {
                    status: 'success',
                    txid,
                    message: `${txStatus} ${extraInfo}`
                };
                if (competingTxs) {
                    broadcastRes.competingTxs = competingTxs;
                }
                return broadcastRes;
            }
            else {
                const st = typeof response.status;
                const r = {
                    status: 'error',
                    code: st === 'number' || st === 'string' ? response.status.toString() : 'ERR_UNKNOWN',
                    description: 'Unknown error'
                };
                let d = response.data;
                if (typeof d === 'string') {
                    try {
                        d = JSON.parse(response.data);
                    }
                    catch { }
                }
                if (typeof d === 'object') {
                    r.more = d;
                    if (typeof d.txid === 'string') {
                        r.txid = d.txid;
                    }
                    if (typeof d.detail === 'string') {
                        r.description = d.detail;
                    }
                }
                return r;
            }
        }
        catch (error) {
            return {
                status: 'error',
                code: '500',
                description: typeof error.message === 'string'
                    ? error.message
                    : 'Internal Server Error'
            };
        }
    }
    requestHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'XDeployment-ID': this.deploymentId
        };
        if (this.apiKey) {
            headers.Authorization = `Bearer ${this.apiKey}`;
        }
        if (this.callbackUrl) {
            headers['X-CallbackUrl'] = this.callbackUrl;
        }
        if (this.callbackToken) {
            headers['X-CallbackToken'] = this.callbackToken;
        }
        if (this.headers) {
            for (const key in this.headers) {
                headers[key] = this.headers[key];
            }
        }
        return headers;
    }
}

function defaultBroadcaster() {
    return new ARC('https://arc.taal.com');
}

/**
 * Represents a chain tracker based on What's On Chain .
 */
class WhatsOnChain {
    network;
    apiKey;
    URL;
    httpClient;
    /**
     * Constructs an instance of the WhatsOnChain ChainTracker.
     *
     * @param {'main' | 'test' | 'stn'} network - The BSV network to use when calling the WhatsOnChain API.
     * @param {WhatsOnChainConfig} config - Configuration options for the WhatsOnChain ChainTracker.
     */
    constructor(network = 'main', config = {}) {
        const { apiKey, httpClient } = config;
        this.network = network;
        this.URL = `https://api.whatsonchain.com/v1/bsv/${network}`;
        this.httpClient = httpClient ?? defaultHttpClient();
        this.apiKey = apiKey;
    }
    async isValidRootForHeight(root, height) {
        const requestOptions = {
            method: 'GET',
            headers: this.getHeaders()
        };
        const response = await this.httpClient.request(`${this.URL}/block/${height}/header`, requestOptions);
        if (response.ok) {
            const { merkleroot } = response.data;
            return merkleroot === root;
        }
        else if (response.status === 404) {
            return false;
        }
        else {
            throw new Error(`Failed to verify merkleroot for height ${height} because of an error: ${JSON.stringify(response.data)} `);
        }
    }
    getHeaders() {
        const headers = {
            Accept: 'application/json'
        };
        if (this.apiKey) {
            headers.Authorization = this.apiKey;
        }
        return headers;
    }
}

function defaultChainTracker() {
    return new WhatsOnChain();
}

const BEEF_MAGIC = 4022206465; // 0100BEEF in LE order

/**
 * Represents a complete Bitcoin transaction. This class encapsulates all the details
 * required for creating, signing, and processing a Bitcoin transaction, including
 * inputs, outputs, and various transaction-related methods.
 *
 * @class Transaction
 * @property {number} version - The version number of the transaction. Used to specify
 *           which set of rules this transaction follows.
 * @property {TransactionInput[]} inputs - An array of TransactionInput objects, representing
 *           the inputs for the transaction. Each input references a previous transaction's output.
 * @property {TransactionOutput[]} outputs - An array of TransactionOutput objects, representing
 *           the outputs for the transaction. Each output specifies the amount of satoshis to be
 *           transferred and the conditions under which they can be spent.
 * @property {number} lockTime - The lock time of the transaction. If non-zero, it specifies the
 *           earliest time or block height at which the transaction can be added to the block chain.
 * @property {Record<string, any>} metadata - A key-value store for attaching additional data to
 *           the transaction object, not included in the transaction itself. Useful for adding descriptions, internal reference numbers, or other information.
 * @property {MerkleProof} [merklePath] - Optional. A merkle proof demonstrating the transaction's
 *           inclusion in a block. Useful for transaction verification using SPV.
 *
 * @example
 * // Creating a new transaction
 * let tx = new Transaction();
 * tx.addInput(...);
 * tx.addOutput(...);
 * await tx.fee();
 * await tx.sign();
 * await tx.broadcast();
 *
 * @description
 * The Transaction class provides comprehensive
 * functionality to handle various aspects of transaction creation, including
 * adding inputs and outputs, computing fees, signing the transaction, and
 * generating its binary or hexadecimal representation.
 */
class Transaction {
    version;
    inputs;
    outputs;
    lockTime;
    metadata;
    merklePath;
    cachedHash;
    /**
     * Creates a new transaction, linked to its inputs and their associated merkle paths, from a BEEF (BRC-62) structure.
     * Optionally, you can provide a specific TXID to retrieve a particular transaction from the BEEF data.
     * If the TXID is provided but not found in the BEEF data, an error will be thrown.
     * If no TXID is provided, the last transaction in the BEEF data is returned.
     * @param beef A binary representation of transactions in BEEF format.
     * @param txid Optional TXID of the transaction to retrieve from the BEEF data.
     * @returns An anchored transaction, linked to its associated inputs populated with merkle paths.
     */
    static fromBEEF(beef, txid) {
        const reader = new Reader(beef);
        const { transactions, BUMPs } = Transaction.parseBEEFData(reader);
        // The last transaction in the BEEF data can be used if txid is not provided
        const txids = Object.keys(transactions);
        const lastTXID = txids[txids.length - 1];
        const targetTXID = txid || lastTXID;
        if (!transactions[targetTXID]) {
            throw new Error(`Transaction with TXID ${targetTXID} not found in BEEF data.`);
        }
        // Recursive function for adding merkle proofs or input transactions
        const addPathOrInputs = (obj) => {
            if (typeof obj.pathIndex === 'number') {
                const path = BUMPs[obj.pathIndex];
                if (typeof path !== 'object') {
                    throw new Error('Invalid merkle path index found in BEEF!');
                }
                obj.tx.merklePath = path;
            }
            else {
                for (let i = 0; i < obj.tx.inputs.length; i++) {
                    const input = obj.tx.inputs[i];
                    const sourceObj = transactions[input.sourceTXID];
                    if (typeof sourceObj !== 'object') {
                        throw new Error(`Reference to unknown TXID in BEEF: ${input.sourceTXID}`);
                    }
                    input.sourceTransaction = sourceObj.tx;
                    addPathOrInputs(sourceObj);
                }
            }
        };
        addPathOrInputs(transactions[targetTXID]);
        return transactions[targetTXID].tx;
    }
    /**
     * Creates a new transaction from an Atomic BEEF (BRC-95) structure.
     * Extracts the subject transaction and ensures that all transactions within the BEEF data
     * are part of the dependency graph of the subject transaction.
     * Throws errors if the Atomic BEEF data does not strictly adhere to the BRC-95 specification.
     *
     * @param beef A binary representation of an Atomic BEEF structure.
     * @returns The subject transaction, linked to its associated inputs populated with merkle paths.
     */
    static fromAtomicBEEF(beef) {
        const reader = new Reader(beef);
        // Read the Atomic BEEF prefix
        const prefix = reader.readUInt32LE();
        if (prefix !== 0x01010101) {
            throw new Error(`Invalid Atomic BEEF prefix. Expected 0x01010101, received ${prefix.toString(16)}.`);
        }
        // Read the subject TXID
        const subjectTXIDArray = reader.read(32);
        const subjectTXID = toHex(subjectTXIDArray);
        // The remaining data is the BEEF data
        const beefReader = new Reader(reader.read());
        const { transactions, BUMPs } = Transaction.parseBEEFData(beefReader);
        // Ensure that the subject transaction exists
        if (!transactions[subjectTXID]) {
            throw new Error(`Subject transaction with TXID ${subjectTXID} not found in Atomic BEEF data.`);
        }
        // Ensure that all transactions are part of the dependency graph of the subject transaction
        const validTxids = new Set();
        // All BUMP level 0 hashes are valid.
        for (const bump of BUMPs) {
            for (const n of bump.path[0])
                if (n.hash)
                    validTxids.add(n.hash);
        }
        // To keep track of which transactions were used.
        const unusedTxTxids = new Set();
        for (const txid of Object.keys(transactions))
            unusedTxTxids.add(txid);
        const traverseDependencies = (txid) => {
            unusedTxTxids.delete(txid);
            if (validTxids.has(txid)) {
                return;
            }
            validTxids.add(txid);
            const tx = transactions[txid].tx;
            for (const input of tx.inputs) {
                const inputTxid = input.sourceTXID;
                if (!transactions[inputTxid]) {
                    throw new Error(`Input transaction with TXID ${inputTxid} is missing in Atomic BEEF data.`);
                }
                traverseDependencies(inputTxid);
            }
        };
        traverseDependencies(subjectTXID);
        // Check for any unrelated transactions
        for (const txid of unusedTxTxids) {
            throw new Error(`Unrelated transaction with TXID ${txid} found in Atomic BEEF data.`);
        }
        // Build the transaction by linking inputs and merkle paths
        const addPathOrInputs = (obj) => {
            if (typeof obj.pathIndex === 'number') {
                const path = BUMPs[obj.pathIndex];
                if (typeof path !== 'object') {
                    throw new Error('Invalid merkle path index found in BEEF!');
                }
                obj.tx.merklePath = path;
            }
            else {
                for (let i = 0; i < obj.tx.inputs.length; i++) {
                    const input = obj.tx.inputs[i];
                    const sourceObj = transactions[input.sourceTXID];
                    if (typeof sourceObj !== 'object') {
                        throw new Error(`Reference to unknown TXID in BEEF: ${input.sourceTXID}`);
                    }
                    input.sourceTransaction = sourceObj.tx;
                    addPathOrInputs(sourceObj);
                }
            }
        };
        addPathOrInputs(transactions[subjectTXID]);
        return transactions[subjectTXID].tx;
    }
    /**
     * Parses BEEF data from a Reader and returns the transactions and BUMPs.
     *
     * @param reader The Reader positioned at the start of BEEF data.
     * @returns An object containing the transactions and BUMPs.
     */
    static parseBEEFData(reader) {
        // Read the version
        const version = reader.readUInt32LE();
        if (version !== BEEF_MAGIC) {
            throw new Error(`Invalid BEEF version. Expected ${BEEF_MAGIC}, received ${version}.`);
        }
        // Read the BUMPs
        const numberOfBUMPs = reader.readVarIntNum();
        const BUMPs = [];
        for (let i = 0; i < numberOfBUMPs; i++) {
            BUMPs.push(MerklePath.fromReader(reader));
        }
        // Read all transactions into an object
        // The object has keys of TXIDs and values of objects with transactions and BUMP indexes
        const numberOfTransactions = reader.readVarIntNum();
        const transactions = {};
        for (let i = 0; i < numberOfTransactions; i++) {
            const tx = Transaction.fromReader(reader);
            const obj = { tx };
            const txid = tx.id('hex');
            const hasBump = Boolean(reader.readUInt8());
            if (hasBump) {
                obj.pathIndex = reader.readVarIntNum();
            }
            transactions[txid] = obj;
        }
        return { transactions, BUMPs };
    }
    /**
     * Creates a new transaction, linked to its inputs and their associated merkle paths, from a EF (BRC-30) structure.
     * @param ef A binary representation of a transaction in EF format.
     * @returns An extended transaction, linked to its associated inputs by locking script and satoshis amounts only.
     */
    static fromEF(ef) {
        const br = new Reader(ef);
        const version = br.readUInt32LE();
        if (toHex(br.read(6)) !== '0000000000ef')
            throw new Error('Invalid EF marker');
        const inputsLength = br.readVarIntNum();
        const inputs = [];
        for (let i = 0; i < inputsLength; i++) {
            const sourceTXID = toHex(br.readReverse(32));
            const sourceOutputIndex = br.readUInt32LE();
            const scriptLength = br.readVarIntNum();
            const scriptBin = br.read(scriptLength);
            const unlockingScript = UnlockingScript.fromBinary(scriptBin);
            const sequence = br.readUInt32LE();
            const satoshis = br.readUInt64LEBn().toNumber();
            const lockingScriptLength = br.readVarIntNum();
            const lockingScriptBin = br.read(lockingScriptLength);
            const lockingScript = LockingScript.fromBinary(lockingScriptBin);
            const sourceTransaction = new Transaction(null, [], [], null);
            sourceTransaction.outputs = Array(sourceOutputIndex + 1).fill(null);
            sourceTransaction.outputs[sourceOutputIndex] = {
                satoshis,
                lockingScript
            };
            inputs.push({
                sourceTransaction,
                sourceTXID,
                sourceOutputIndex,
                unlockingScript,
                sequence
            });
        }
        const outputsLength = br.readVarIntNum();
        const outputs = [];
        for (let i = 0; i < outputsLength; i++) {
            const satoshis = br.readUInt64LEBn().toNumber();
            const scriptLength = br.readVarIntNum();
            const scriptBin = br.read(scriptLength);
            const lockingScript = LockingScript.fromBinary(scriptBin);
            outputs.push({
                satoshis,
                lockingScript
            });
        }
        const lockTime = br.readUInt32LE();
        return new Transaction(version, inputs, outputs, lockTime);
    }
    /**
     * Since the validation of blockchain data is atomically transaction data validation,
     * any application seeking to validate data in output scripts must store the entire transaction as well.
     * Since the transaction data includes the output script data, saving a second copy of potentially
     * large scripts can bloat application storage requirements.
     *
     * This function efficiently parses binary transaction data to determine the offsets and lengths of each script.
     * This supports the efficient retreival of script data from transaction data.
     *
     * @param bin binary transaction data
     * @returns {
     *   inputs: { vin: number, offset: number, length: number }[]
     *   outputs: { vout: number, offset: number, length: number }[]
     * }
     */
    static parseScriptOffsets(bin) {
        const br = new Reader(bin);
        const inputs = [];
        const outputs = [];
        br.pos += 4; // version
        const inputsLength = br.readVarIntNum();
        for (let i = 0; i < inputsLength; i++) {
            br.pos += 36; // txid and vout
            const scriptLength = br.readVarIntNum();
            inputs.push({ vin: i, offset: br.pos, length: scriptLength });
            br.pos += scriptLength + 4; // script and sequence
        }
        const outputsLength = br.readVarIntNum();
        for (let i = 0; i < outputsLength; i++) {
            br.pos += 8; // satoshis
            const scriptLength = br.readVarIntNum();
            outputs.push({ vout: i, offset: br.pos, length: scriptLength });
            br.pos += scriptLength;
        }
        return { inputs, outputs };
    }
    static fromReader(br) {
        const version = br.readUInt32LE();
        const inputsLength = br.readVarIntNum();
        const inputs = [];
        for (let i = 0; i < inputsLength; i++) {
            const sourceTXID = toHex(br.readReverse(32));
            const sourceOutputIndex = br.readUInt32LE();
            const scriptLength = br.readVarIntNum();
            const scriptBin = br.read(scriptLength);
            const unlockingScript = UnlockingScript.fromBinary(scriptBin);
            const sequence = br.readUInt32LE();
            inputs.push({
                sourceTXID,
                sourceOutputIndex,
                unlockingScript,
                sequence
            });
        }
        const outputsLength = br.readVarIntNum();
        const outputs = [];
        for (let i = 0; i < outputsLength; i++) {
            const satoshis = br.readUInt64LEBn().toNumber();
            const scriptLength = br.readVarIntNum();
            const scriptBin = br.read(scriptLength);
            const lockingScript = LockingScript.fromBinary(scriptBin);
            outputs.push({
                satoshis,
                lockingScript
            });
        }
        const lockTime = br.readUInt32LE();
        return new Transaction(version, inputs, outputs, lockTime);
    }
    /**
     * Creates a Transaction instance from a binary array.
     *
     * @static
     * @param {number[]} bin - The binary array representation of the transaction.
     * @returns {Transaction} - A new Transaction instance.
     */
    static fromBinary(bin) {
        const br = new Reader(bin);
        return Transaction.fromReader(br);
    }
    /**
     * Creates a Transaction instance from a hexadecimal string.
     *
     * @static
     * @param {string} hex - The hexadecimal string representation of the transaction.
     * @returns {Transaction} - A new Transaction instance.
     */
    static fromHex(hex) {
        return Transaction.fromBinary(toArray(hex, 'hex'));
    }
    /**
     * Creates a Transaction instance from a hexadecimal string encoded EF.
     *
     * @static
     * @param {string} hex - The hexadecimal string representation of the transaction EF.
     * @returns {Transaction} - A new Transaction instance.
     */
    static fromHexEF(hex) {
        return Transaction.fromEF(toArray(hex, 'hex'));
    }
    /**
     * Creates a Transaction instance from a hexadecimal string encoded BEEF.
     * Optionally, you can provide a specific TXID to retrieve a particular transaction from the BEEF data.
     * If the TXID is provided but not found in the BEEF data, an error will be thrown.
     * If no TXID is provided, the last transaction in the BEEF data is returned.
     *
     * @static
     * @param {string} hex - The hexadecimal string representation of the transaction BEEF.
     * @param {string} [txid] - Optional TXID of the transaction to retrieve from the BEEF data.
     * @returns {Transaction} - A new Transaction instance.
     */
    static fromHexBEEF(hex, txid) {
        return Transaction.fromBEEF(toArray(hex, 'hex'), txid);
    }
    constructor(version = 1, inputs = [], outputs = [], lockTime = 0, metadata = {}, merklePath) {
        this.version = version;
        this.inputs = inputs;
        this.outputs = outputs;
        this.lockTime = lockTime;
        this.metadata = metadata;
        this.merklePath = merklePath;
    }
    /**
     * Adds a new input to the transaction.
     *
     * @param {TransactionInput} input - The TransactionInput object to add to the transaction.
     * @throws {Error} - If the input does not have a sourceTXID or sourceTransaction defined.
     */
    addInput(input) {
        if (typeof input.sourceTXID === 'undefined' &&
            typeof input.sourceTransaction === 'undefined') {
            throw new Error('A reference to an an input transaction is required. If the input transaction itself cannot be referenced, its TXID must still be provided.');
        }
        // If the input sequence number hasn't been set, the expectation is that it is final.
        if (typeof input.sequence === 'undefined') {
            input.sequence = 0xFFFFFFFF;
        }
        this.cachedHash = undefined;
        this.inputs.push(input);
    }
    /**
     * Adds a new output to the transaction.
     *
     * @param {TransactionOutput} output - The TransactionOutput object to add to the transaction.
     */
    addOutput(output) {
        this.cachedHash = undefined;
        this.outputs.push(output);
    }
    /**
     * Updates the transaction's metadata.
     *
     * @param {Record<string, any>} metadata - The metadata object to merge into the existing metadata.
     */
    updateMetadata(metadata) {
        this.metadata = {
            ...this.metadata,
            ...metadata
        };
    }
    /**
     * Computes fees prior to signing.
     * If no fee model is provided, uses a SatoshisPerKilobyte fee model that pays 10 sat/kb.
     * If fee is a number, the transaction uses that value as fee.
     *
     * @param modelOrFee - The initialized fee model to use or fixed fee for the transaction
     * @param changeDistribution - Specifies how the change should be distributed
     * amongst the change outputs
     *
     * TODO: Benford's law change distribution.
     */
    async fee(modelOrFee, changeDistribution = 'equal') {
        this.cachedHash = undefined;
        if (typeof modelOrFee === 'undefined') {
            modelOrFee = new SatoshisPerKilobyte(10);
        }
        if (typeof modelOrFee === 'number') {
            const sats = modelOrFee;
            modelOrFee = {
                computeFee: async () => sats
            };
        }
        const fee = await modelOrFee.computeFee(this);
        // change = inputs - fee - non-change outputs
        let change = 0;
        for (const input of this.inputs) {
            if (typeof input.sourceTransaction !== 'object') {
                throw new Error('Source transactions are required for all inputs during fee computation');
            }
            change += input.sourceTransaction.outputs[input.sourceOutputIndex].satoshis;
        }
        change -= fee;
        let changeCount = 0;
        for (const out of this.outputs) {
            if (!out.change) {
                change -= out.satoshis;
            }
            else {
                changeCount++;
            }
        }
        if (change <= changeCount) {
            // There is not enough change to distribute among the change outputs.
            // We'll remove all change outputs and leave the extra for the miners.
            for (let i = 0; i < this.outputs.length; i++) {
                if (this.outputs[i].change) {
                    this.outputs.splice(i, 1);
                    i--;
                }
            }
            return;
        }
        // Distribute change among change outputs
        if (changeDistribution === 'random') {
            // TODO
            throw new Error('Not yet implemented');
        }
        else if (changeDistribution === 'equal') {
            const perOutput = Math.floor(change / changeCount);
            for (const out of this.outputs) {
                if (out.change) {
                    out.satoshis = perOutput;
                }
            }
        }
    }
    /**
     * Utility method that returns the current fee based on inputs and outputs
     *
     * @returns The current transaction fee
     */
    getFee() {
        let totalIn = 0;
        for (const input of this.inputs) {
            if (typeof input.sourceTransaction !== 'object') {
                throw new Error('Source transactions or sourceSatoshis are required for all inputs to calculate fee');
            }
            totalIn += input.sourceTransaction.outputs[input.sourceOutputIndex].satoshis;
        }
        let totalOut = 0;
        for (const output of this.outputs) {
            totalOut += output.satoshis || 0;
        }
        return totalIn - totalOut;
    }
    /**
     * Signs a transaction, hydrating all its unlocking scripts based on the provided script templates where they are available.
     */
    async sign() {
        this.cachedHash = undefined;
        for (const out of this.outputs) {
            if (typeof out.satoshis === 'undefined') {
                if (out.change) {
                    throw new Error('There are still change outputs with uncomputed amounts. Use the fee() method to compute the change amounts and transaction fees prior to signing.');
                }
                else {
                    throw new Error('One or more transaction outputs is missing an amount. Ensure all output amounts are provided before signing.');
                }
            }
        }
        const unlockingScripts = await Promise.all(this.inputs.map(async (x, i) => {
            if (typeof this.inputs[i].unlockingScriptTemplate === 'object') {
                return await this.inputs[i].unlockingScriptTemplate.sign(this, i);
            }
            else {
                return await Promise.resolve(undefined);
            }
        }));
        for (let i = 0, l = this.inputs.length; i < l; i++) {
            if (typeof this.inputs[i].unlockingScriptTemplate === 'object') {
                this.inputs[i].unlockingScript = unlockingScripts[i];
            }
        }
    }
    /**
     * Broadcasts a transaction.
     *
     * @param broadcaster The Broadcaster instance wwhere the transaction will be sent
     * @returns A BroadcastResponse or BroadcastFailure from the Broadcaster
     */
    async broadcast(broadcaster = defaultBroadcaster()) {
        return await broadcaster.broadcast(this);
    }
    /**
     * Converts the transaction to a binary array format.
     *
     * @returns {number[]} - The binary array representation of the transaction.
     */
    toBinary() {
        const writer = new Writer();
        writer.writeUInt32LE(this.version);
        writer.writeVarIntNum(this.inputs.length);
        for (const i of this.inputs) {
            if (typeof i.sourceTXID === 'undefined') {
                writer.write(i.sourceTransaction.hash());
            }
            else {
                writer.writeReverse(toArray(i.sourceTXID, 'hex'));
            }
            writer.writeUInt32LE(i.sourceOutputIndex);
            const scriptBin = i.unlockingScript.toBinary();
            writer.writeVarIntNum(scriptBin.length);
            writer.write(scriptBin);
            writer.writeUInt32LE(i.sequence);
        }
        writer.writeVarIntNum(this.outputs.length);
        for (const o of this.outputs) {
            writer.writeUInt64LE(o.satoshis);
            const scriptBin = o.lockingScript.toBinary();
            writer.writeVarIntNum(scriptBin.length);
            writer.write(scriptBin);
        }
        writer.writeUInt32LE(this.lockTime);
        return writer.toArray();
    }
    /**
     * Converts the transaction to a BRC-30 EF format.
     *
     * @returns {number[]} - The BRC-30 EF representation of the transaction.
     */
    toEF() {
        const writer = new Writer();
        writer.writeUInt32LE(this.version);
        writer.write([0, 0, 0, 0, 0, 0xef]);
        writer.writeVarIntNum(this.inputs.length);
        for (const i of this.inputs) {
            if (typeof i.sourceTransaction === 'undefined') {
                throw new Error('All inputs must have source transactions when serializing to EF format');
            }
            if (typeof i.sourceTXID === 'undefined') {
                writer.write(i.sourceTransaction.hash());
            }
            else {
                writer.write(toArray(i.sourceTXID, 'hex').reverse());
            }
            writer.writeUInt32LE(i.sourceOutputIndex);
            const scriptBin = i.unlockingScript.toBinary();
            writer.writeVarIntNum(scriptBin.length);
            writer.write(scriptBin);
            writer.writeUInt32LE(i.sequence);
            writer.writeUInt64LE(i.sourceTransaction.outputs[i.sourceOutputIndex].satoshis);
            const lockingScriptBin = i.sourceTransaction.outputs[i.sourceOutputIndex].lockingScript.toBinary();
            writer.writeVarIntNum(lockingScriptBin.length);
            writer.write(lockingScriptBin);
        }
        writer.writeVarIntNum(this.outputs.length);
        for (const o of this.outputs) {
            writer.writeUInt64LE(o.satoshis);
            const scriptBin = o.lockingScript.toBinary();
            writer.writeVarIntNum(scriptBin.length);
            writer.write(scriptBin);
        }
        writer.writeUInt32LE(this.lockTime);
        return writer.toArray();
    }
    /**
     * Converts the transaction to a hexadecimal string EF.
     *
     * @returns {string} - The hexadecimal string representation of the transaction EF.
     */
    toHexEF() {
        return toHex(this.toEF());
    }
    /**
     * Converts the transaction to a hexadecimal string format.
     *
     * @returns {string} - The hexadecimal string representation of the transaction.
     */
    toHex() {
        return toHex(this.toBinary());
    }
    /**
     * Converts the transaction to a hexadecimal string BEEF.
     *
     * @returns {string} - The hexadecimal string representation of the transaction BEEF.
     */
    toHexBEEF() {
        return toHex(this.toBEEF());
    }
    /**
     * Converts the transaction to a hexadecimal string Atomic BEEF.
     *
     * @returns {string} - The hexadecimal string representation of the transaction Atomic BEEF.
     */
    toHexAtomicBEEF() {
        return toHex(this.toAtomicBEEF());
    }
    /**
     * Calculates the transaction's hash.
     *
     * @param {'hex' | undefined} enc - The encoding to use for the hash. If 'hex', returns a hexadecimal string; otherwise returns a binary array.
     * @returns {string | number[]} - The hash of the transaction in the specified format.
     */
    hash(enc) {
        let hash;
        if (this.cachedHash) {
            hash = this.cachedHash;
        }
        else {
            hash = hash256(this.toBinary());
            this.cachedHash = hash;
        }
        if (enc === 'hex') {
            return toHex(hash);
        }
        return hash;
    }
    /**
     * Calculates the transaction's ID.
     *
     * @param {'hex' | undefined} enc - The encoding to use for the ID. If 'hex', returns a hexadecimal string; otherwise returns a binary array.
     * @returns {string | number[]} - The ID of the transaction in the specified format.
     */
    id(enc) {
        const id = [...this.hash()];
        id.reverse();
        if (enc === 'hex') {
            return toHex(id);
        }
        return id;
    }
    /**
     * Verifies the legitimacy of the Bitcoin transaction according to the rules of SPV by ensuring all the input transactions link back to valid block headers, the chain of spends for all inputs are valid, and the sum of inputs is not less than the sum of outputs.
     *
     * @param chainTracker - An instance of ChainTracker, a Bitcoin block header tracker. If the value is set to 'scripts only', headers will not be verified. If not provided then the default chain tracker will be used.
     *
     * @returns Whether the transaction is valid according to the rules of SPV.
     *
     * @example tx.verify(new WhatsOnChain(), new SatoshisPerKilobyte(1))
     */
    async verify(chainTracker = defaultChainTracker(), feeModel) {
        const verifiedTxids = new Set();
        const txQueue = [this];
        while (txQueue.length > 0) {
            const tx = txQueue.shift();
            const txid = tx.id('hex');
            if (verifiedTxids.has(txid)) {
                continue;
            }
            // If the transaction has a valid merkle path, verification is complete.
            if (typeof tx.merklePath === 'object') {
                if (chainTracker === 'scripts only') {
                    verifiedTxids.add(txid);
                    continue;
                }
                else {
                    const proofValid = await tx.merklePath.verify(txid, chainTracker);
                    // If the proof is valid, no need to verify inputs.
                    if (proofValid) {
                        verifiedTxids.add(txid);
                        continue;
                    }
                }
            }
            // Verify fee if feeModel is provided
            if (typeof feeModel !== 'undefined') {
                const cpTx = Transaction.fromEF(tx.toEF());
                delete cpTx.outputs[0].satoshis;
                cpTx.outputs[0].change = true;
                await cpTx.fee(feeModel);
                if (tx.getFee() < cpTx.getFee()) {
                    throw new Error(`Verification failed because the transaction ${txid} has an insufficient fee and has not been mined.`);
                }
            }
            // Verify each input transaction and evaluate the spend events.
            // Also, keep a total of the input amounts for later.
            let inputTotal = 0;
            for (let i = 0; i < tx.inputs.length; i++) {
                const input = tx.inputs[i];
                if (typeof input.sourceTransaction !== 'object') {
                    throw new Error(`Verification failed because the input at index ${i} of transaction ${txid} is missing an associated source transaction. This source transaction is required for transaction verification because there is no merkle proof for the transaction spending a UTXO it contains.`);
                }
                if (typeof input.unlockingScript !== 'object') {
                    throw new Error(`Verification failed because the input at index ${i} of transaction ${txid} is missing an associated unlocking script. This script is required for transaction verification because there is no merkle proof for the transaction spending the UTXO.`);
                }
                const sourceOutput = input.sourceTransaction.outputs[input.sourceOutputIndex];
                inputTotal += sourceOutput.satoshis;
                const sourceTxid = input.sourceTransaction.id('hex');
                if (!verifiedTxids.has(sourceTxid)) {
                    txQueue.push(input.sourceTransaction);
                }
                const otherInputs = tx.inputs.filter((_, idx) => idx !== i);
                if (typeof input.sourceTXID === 'undefined') {
                    input.sourceTXID = sourceTxid;
                }
                const spend = new Spend({
                    sourceTXID: input.sourceTXID,
                    sourceOutputIndex: input.sourceOutputIndex,
                    lockingScript: sourceOutput.lockingScript,
                    sourceSatoshis: sourceOutput.satoshis,
                    transactionVersion: tx.version,
                    otherInputs,
                    unlockingScript: input.unlockingScript,
                    inputSequence: input.sequence,
                    inputIndex: i,
                    outputs: tx.outputs,
                    lockTime: tx.lockTime
                });
                const spendValid = spend.validate();
                if (!spendValid) {
                    return false;
                }
            }
            // Total the outputs to ensure they don't amount to more than the inputs
            let outputTotal = 0;
            for (const out of tx.outputs) {
                if (typeof out.satoshis !== 'number') {
                    throw new Error('Every output must have a defined amount during transaction verification.');
                }
                outputTotal += out.satoshis;
            }
            if (outputTotal > inputTotal) {
                return false;
            }
            verifiedTxids.add(txid);
        }
        return true;
    }
    /**
     * Serializes this transaction, together with its inputs and the respective merkle proofs, into the BEEF (BRC-62) format. This enables efficient verification of its compliance with the rules of SPV.
     *
     * @param allowPartial If true, error will not be thrown if there are any missing sourceTransactions.
     *
     * @returns The serialized BEEF structure
     * @throws Error if there are any missing sourceTransactions unless `allowPartial` is true.
     */
    toBEEF(allowPartial) {
        const writer = new Writer();
        writer.writeUInt32LE(4022206465);
        const BUMPs = [];
        const txs = [];
        // Recursive function to add paths and input transactions for a TX
        const addPathsAndInputs = (tx) => {
            const obj = { tx };
            const hasProof = typeof tx.merklePath === 'object';
            if (hasProof) {
                let added = false;
                // If this proof is identical to another one previously added, we use that first. Otherwise, we try to merge it with proofs from the same block.
                for (let i = 0; i < BUMPs.length; i++) {
                    if (BUMPs[i] === tx.merklePath) { // Literally the same
                        obj.pathIndex = i;
                        added = true;
                        break;
                    }
                    if (BUMPs[i].blockHeight === tx.merklePath.blockHeight) {
                        // Probably the same...
                        const rootA = BUMPs[i].computeRoot();
                        const rootB = tx.merklePath.computeRoot();
                        if (rootA === rootB) {
                            // Definitely the same... combine them to save space
                            BUMPs[i].combine(tx.merklePath);
                            obj.pathIndex = i;
                            added = true;
                            break;
                        }
                    }
                }
                // Finally, if the proof is not yet added, add a new path.
                if (!added) {
                    obj.pathIndex = BUMPs.length;
                    BUMPs.push(tx.merklePath);
                }
            }
            const duplicate = txs.some(x => x.tx.id('hex') === tx.id('hex'));
            if (!duplicate) {
                txs.unshift(obj);
            }
            if (!hasProof) {
                for (let i = 0; i < tx.inputs.length; i++) {
                    const input = tx.inputs[i];
                    if (typeof input.sourceTransaction === 'object')
                        addPathsAndInputs(input.sourceTransaction);
                    else if (!allowPartial)
                        throw new Error('A required source transaction is missing!');
                }
            }
        };
        addPathsAndInputs(this);
        writer.writeVarIntNum(BUMPs.length);
        for (const b of BUMPs) {
            writer.write(b.toBinary());
        }
        writer.writeVarIntNum(txs.length);
        for (const t of txs) {
            writer.write(t.tx.toBinary());
            if (typeof t.pathIndex === 'number') {
                writer.writeUInt8(1);
                writer.writeVarIntNum(t.pathIndex);
            }
            else {
                writer.writeUInt8(0);
            }
        }
        return writer.toArray();
    }
    /**
     * Serializes this transaction and its inputs into the Atomic BEEF (BRC-95) format.
     * The Atomic BEEF format starts with a 4-byte prefix `0x01010101`, followed by the TXID of the subject transaction,
     * and then the BEEF data containing only the subject transaction and its dependencies.
     * This format ensures that the BEEF structure is atomic and contains no unrelated transactions.
     *
     * @param allowPartial If true, error will not be thrown if there are any missing sourceTransactions.
     *
     * @returns {number[]} - The serialized Atomic BEEF structure.
     * @throws Error if there are any missing sourceTransactions unless `allowPartial` is true.
     */
    toAtomicBEEF(allowPartial) {
        const writer = new Writer();
        // Write the Atomic BEEF prefix
        writer.writeUInt32LE(0x01010101);
        // Write the subject TXID (big-endian)
        writer.write(this.id());
        // Append the BEEF data
        const beefData = this.toBEEF(allowPartial);
        writer.write(beefData);
        return writer.toArray();
    }
}

const prefix = 'Bitcoin Signed Message:\n';
/**
 * Generates a SHA256 double-hash of the prefixed message.
 * @deprecated Replaced by BRC-77 which uses a more secure and private method for message signing.
 * @param messageBuf The message buffer to be hashed.
 * @returns The double-hash of the prefixed message as a number array.
 */
const magicHash = (messageBuf) => {
    const bw = new Writer();
    bw.writeVarIntNum(prefix.length);
    bw.write(toArray(prefix, 'utf8'));
    bw.writeVarIntNum(messageBuf.length);
    bw.write(messageBuf);
    const buf = bw.toArray();
    const hashBuf = hash256(buf);
    return hashBuf;
};
/**
 * Signs a BSM message using the given private key.
 * @deprecated Replaced by BRC-77 which employs BRC-42 key derivation and BRC-43 invoice numbers for enhanced security and privacy.
 * @param message The message to be signed as a number array.
 * @param privateKey The private key used for signing the message.
 * @param mode The mode of operation. When "base64", the BSM format signature is returned. When "raw", a Signature object is returned. Default: "base64".
 * @returns The signature object when in raw mode, or the BSM base64 string when in base64 mode.
 */
const sign = (message, privateKey, mode = 'base64') => {
    const hashBuf = magicHash(message);
    const sig = sign$1(new BigNumber(hashBuf), privateKey, true);
    if (mode === 'raw') {
        return sig;
    }
    const h = new BigNumber(hashBuf);
    const r = sig.CalculateRecoveryFactor(privateKey.toPublicKey(), h);
    return sig.toCompact(r, true, 'base64');
};
/**
 * Verifies a BSM signed message using the given public key.
 * @deprecated Replaced by BRC-77 which provides privately-verifiable signatures and avoids key reuse.
 * @param message The message to be verified as a number array.
 * @param sig The signature object.
 * @param pubKey The public key for verification.
 * @returns True if the signature is valid, false otherwise.
 */
const verify = (message, sig, pubKey) => {
    const hashBuf = magicHash(message);
    return verify$1(new BigNumber(hashBuf), sig, pubKey);
};

/**
 * @method fromUtxo
 *
 * @description
 * This function creates a transaction input from a utxo json object
 * The idea being old code that uses utxos rather than sourceTranactions can convert using this.
 *
 * @deprecated
 * This approach is made available for compatibility only. It is deprecated in favor of using sourceTransactions
 * directly. It's recommended that wallets general keep transactions which store unspent outputs in their entirety,
 * along with corresonding Merkle paths. The reason you would keep the whole transaction is such that you can prove
 * the txid, and therefore its inclusion within a specific block.
 *
 * @example
 * const i = fromUtxo({
 *   txid: '434555433eaca96dff6e71a4d02febd0dd3832e5ca4e5734623ca914522e17d5',
 *   vout: 0,
 *   script: '51',
 *   satoshis: 1234
 * }, new P2PKH().unlock(p))
 *
 * tx.addInput(i)
 *
 * @param utxo: jsonUtxo
 * @param unlockingScriptTemplate: { sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>, estimateLength: (tx: Transaction, inputIndex: number) => Promise<number> }
 * @returns
 */
function fromUtxo(utxo, unlockingScriptTemplate) {
    const sourceTransaction = new Transaction(0, [], [], 0);
    sourceTransaction.outputs = Array(utxo.vout + 1).fill(null);
    sourceTransaction.outputs[utxo.vout] = {
        satoshis: utxo.satoshis,
        lockingScript: LockingScript.fromHex(utxo.script)
    };
    return {
        sourceTransaction,
        sourceTXID: utxo.txid,
        sourceOutputIndex: utxo.vout,
        unlockingScriptTemplate,
        sequence: 0xFFFFFFFF
    };
}

function t(...t){return t.every(t=>"string"==typeof t)}function r(...t){return t.every(t=>"number"==typeof t)}const e={String:"string",BigInt:"bigint",Number:"number"};function n(e,n,i){if(!t(e)&&!r(e))throw new TypeError("toToken must be called on a number or string, got "+typeof e);if(!Number.isInteger(Number(e)))throw new TypeError("toToken must be called on a whole number or string format whole number");if(!Number.isInteger(n)||n<0)throw new TypeError("decimals must be a non-negative integer");let o=0n;const a="string"==typeof e?e.startsWith("-"):e<0;switch(typeof e){case"bigint":o=e;break;case"string":o=BigInt(e.replace("-","").split(".")[0]);break;default:o=BigInt(Math.abs(Math.round(e)));}const s=a?-1n:1n,u=o/10n**BigInt(n),g=o%10n**BigInt(n);switch(i){case"bigint":if(g>0)throw new Error("toToken: Cannot return a bigint with decimal part");return u*s;case"string":return `${a&&(u>0||g>0)?"-":""}${u}.${g.toString().padStart(n,"0")}`;default:return Number(`${a&&(u>0||g>0)?"-":""}${u}.${g.toString().padStart(n,"0")}`)}}function i(e,n,i){if(!t(e)&&!r(e)&&!function(...t){return t.every(t=>"bigint"==typeof t)}(e))throw new TypeError("toTokenSat must be called on a number, string or bigint, got "+typeof e);if(!Number.isInteger(n)||n<0)throw new TypeError("decimals must be a non-negative integer");let o="";const a="string"==typeof e?e.startsWith("-")&&"-0"!==e:e<0;switch(typeof e){case"bigint":o=(e*10n**BigInt(n)).toString();break;case"string":{const t=e.replace("-",""),[r,i]=t.split(".");o=r+(i||"").padEnd(n,"0"),!a||"0"===r&&"0"===i||(o=`-${o}`);break}default:o=(Math.round(Math.abs(e)*10**n)*(a?-1:1)).toString();}switch(i){case"bigint":return BigInt(o);case"string":return o;default:{let t;try{t=Number(o);}catch(t){throw new Error(`Invalid number: ${o}`)}if(!Number.isSafeInteger(Math.round(t)))throw new Error("Integer overflow. Try returning a string instead.");return t}}}

function a(){return a=Object.assign?Object.assign.bind():function(t){for(var r=1;r<arguments.length;r++){var n=arguments[r];for(var e in n)({}).hasOwnProperty.call(n,e)&&(t[e]=n[e]);}return t},a.apply(null,arguments)}function u(t){var r=function(t){if("object"!=typeof t||!t)return t;var r=t[Symbol.toPrimitive];if(void 0!==r){var n=r.call(t,"string");if("object"!=typeof n)return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(t)}(t);return "symbol"==typeof r?r:r+""}var h,c=magicHash,f=toHex,g="5349474d41";!function(t){t.BSM="BSM";}(h||(h={}));var l=/*#__PURE__*/function(){function s(n,e,i,s){var a=this;void 0===e&&(e=0),void 0===i&&(i=0),void 0===s&&(s=0),this._inputHash=null,this._dataHash=null,this._transaction=void 0,this._sigmaInstance=void 0,this._refVin=void 0,this._targetVout=void 0,this._sig=void 0,this.setHashes=function(){a._inputHash=a.getInputHash(),a._dataHash=a.getDataHash();},this.setTargetVout=function(t){a._targetVout=t;},this.setSigmaInstance=function(t){a._sigmaInstance=t;},this.verify=function(){if(!a.sig)throw new Error("No signature data provided");var t=a.getMessageHash();if(!t)throw new Error("No tx data provided");var r=Signature.fromCompact(a.sig.signature,"base64");return -1!==p(r,t,a.sig.address)},this.getInputHash=function(){return a._getInputHashByVin(-1===a._refVin?a._targetVout:a._refVin)},this._getInputHashByVin=function(r){var n=a._transaction.inputs[r];if(null!=n&&n.sourceTXID){var e=Buffer.alloc(36),i=Buffer.from(n.sourceTXID,"hex");return e.set(i,0),e.writeUInt32LE(n.sourceOutputIndex,32),sha256(Array.from(e))}return sha256(Array.from(new Uint8Array(32)))},this.getDataHash=function(){var n;if(!a._transaction)throw new Error("No transaction provided");for(var e=null==(n=a._transaction)?void 0:n.outputs[a._targetVout].lockingScript,i=(null==e?void 0:e.toASM().split(" "))||[],o=0,s=0;s<i.length;s++)if(i[s].toUpperCase()===g.toUpperCase()){if(o===a._sigmaInstance){var u=i.slice(0,s-1),h=Script.fromASM(u.join(" "));return sha256(h.toBinary())}o++;}var c=Script.fromASM(i.join(" "));return sha256(c.toBinary())},this._transaction=n,this._targetVout=e,this._refVin=s,this._sigmaInstance=i,this._sig=this.sig,this.setHashes();}var l,v,d=s.prototype;return d.getMessageHash=function(){if(!this._inputHash||!this._dataHash)throw new Error("Input hash and data hash must be set");var r=this._inputHash,n=this._dataHash,e=new Uint8Array(r.length+n.length);return e.set(r,0),e.set(n,r.length),sha256(Array.from(e))},d._sign=function(t,e,i){var o,s,u,c=-1===this._refVin?this._targetVout:this._refVin;if(void 0===i)throw new Error("Failed recovery missing");var f=g+" "+Buffer.from(h.BSM,"utf-8").toString("hex")+" "+Buffer.from(e,"utf-8").toString("hex")+" "+t.toCompact(i,!0,"hex")+" "+Buffer.from(c.toString(),"utf-8").toString("hex"),l=Script.fromASM(f);this._sig={algorithm:h.BSM,address:e,signature:t.toCompact(i,!0,"base64"),vin:c,targetVout:this._targetVout};var p=null==(o=this.targetTxOut)?void 0:o.lockingScript.toASM(),v=(null==(s=p)?void 0:s.split(" ").includes("OP_RETURN"))?"7c":"OP_RETURN";if(this.sig&&this._sigmaInstance===this.getSigInstanceCount()){var d,m=(null==(d=p)?void 0:d.split(" "))||[],_=this.getSigInstancePosition(),y=f.split(" ");-1!==_&&(p=m.splice.apply(m,[_,5].concat(y)).join(""));}var S=Script.fromASM(p+" "+v+" "+f),w=new Transaction(this._transaction.version,this._transaction.inputs.map(function(t){return a({},t)}),this._transaction.outputs.map(function(t){return a({},t)})),b={satoshis:null==(u=this.targetTxOut)?void 0:u.satoshis,lockingScript:S};return w.outputs[this._targetVout]=b,this._transaction=w,a({sigmaScript:l,signedTx:w},this._sig)},d.sign=function(t){var r=this.getMessageHash(),n=sign(r,t,"raw"),o=t.toAddress(),s=new BigNumber(c(r)),a=n.CalculateRecoveryFactor(t.toPublicKey(),s);return this._sign(n,o,a)},d.remoteSign=function(t,r){try{var n,e=this,i=r?((n={})[r.key]=r.value,n):{},s=t+"/sign"+("query"===(null==r?void 0:r.type)?"?"+(null==r?void 0:r.key)+"="+(null==r?void 0:r.value):""),u={message:f(e.getMessageHash()),encoding:"hex"};return Promise.resolve(function(t,r){try{var n=Promise.resolve(fetch(s,{method:"POST",headers:a({},i,{"Content-Type":"application/json",Accept:"application/json"}),body:JSON.stringify(u)})).then(function(t){function r(r){return Promise.resolve(t.json()).then(function(t){var r=t.address,n=t.recovery,i=Signature.fromCompact(t.sig,"base64");return e._sign(i,r,n)})}var n=function(){if(!t.ok)return Promise.resolve(t.text()).then(function(r){throw console.error("Response Error:",r),new Error("HTTP Error: "+t.status)})}();return n&&n.then?n.then(r):r()});}catch(t){return r(t)}return n&&n.then?n.then(void 0,r):n}(0,function(t){throw console.error("Fetch Error:",t),t}))}catch(t){return Promise.reject(t)}},d.getSigInstanceCount=function(){var t,r=null==(t=this.targetTxOut)?void 0:t.lockingScript.toASM();return ((null==r?void 0:r.split(" "))||[]).filter(function(t){return t.toUpperCase()===g.toUpperCase()}).length},d.getSigInstancePosition=function(){var t,r=null==(t=this.targetTxOut)?void 0:t.lockingScript.toASM();return ((null==r?void 0:r.split(" "))||[]).findIndex(function(t){return t.toUpperCase()===g.toUpperCase()})},l=s,(v=[{key:"transaction",get:function(){return this._transaction}},{key:"targetTxOut",get:function(){return this._transaction.outputs[this._targetVout]||null}},{key:"sig",get:function(){for(var t=this._transaction.outputs[this._targetVout],r=null==t?void 0:t.lockingScript,n=(null==r?void 0:r.toASM().split(" "))||[],e=[],i=0;i<n.length;i++)if(n[i].toUpperCase()===g.toUpperCase()){var o={algorithm:Buffer.from(n[i+1],"hex").toString("utf-8"),address:Buffer.from(n[i+2],"hex").toString("utf-8"),signature:Buffer.from(n[i+3],"hex").toString("base64"),vin:Number.parseInt(Buffer.from(n[i+4],"hex").toString("utf-8"))};e.push(o),i+=4;}return 0===e.length?this._sig:e[this._sigmaInstance]}}])&&function(t,r){for(var n=0;n<r.length;n++){var e=r[n];e.enumerable=e.enumerable||!1,e.configurable=!0,"value"in e&&(e.writable=!0),Object.defineProperty(t,u(e.key),e);}}(l.prototype,v),Object.defineProperty(l,"prototype",{writable:!1}),l}(),p=function(t,r,n){for(var o=0;o<4;o++)try{var s=t.RecoverPublicKey(o,new BigNumber(c(r)));if(verify(r,t,s)&&s.toAddress()===n)return o}catch(t){}return -1};

const decoder = new TextDecoder();
const toUTF8String = (input, start = 0, end = input.length) => decoder.decode(input.slice(start, end));
const toHexString = (input, start = 0, end = input.length) => input.slice(start, end).reduce((memo, i) => memo + ("0" + i.toString(16)).slice(-2), "");
const readInt16LE = (input, offset = 0) => {
  const val = input[offset] + input[offset + 1] * 2 ** 8;
  return val | (val & 2 ** 15) * 131070;
};
const readUInt16BE = (input, offset = 0) => input[offset] * 2 ** 8 + input[offset + 1];
const readUInt16LE = (input, offset = 0) => input[offset] + input[offset + 1] * 2 ** 8;
const readUInt24LE = (input, offset = 0) => input[offset] + input[offset + 1] * 2 ** 8 + input[offset + 2] * 2 ** 16;
const readInt32LE = (input, offset = 0) => input[offset] + input[offset + 1] * 2 ** 8 + input[offset + 2] * 2 ** 16 + (input[offset + 3] << 24);
const readUInt32BE = (input, offset = 0) => input[offset] * 2 ** 24 + input[offset + 1] * 2 ** 16 + input[offset + 2] * 2 ** 8 + input[offset + 3];
const readUInt32LE = (input, offset = 0) => input[offset] + input[offset + 1] * 2 ** 8 + input[offset + 2] * 2 ** 16 + input[offset + 3] * 2 ** 24;
const methods = {
  readUInt16BE,
  readUInt16LE,
  readUInt32BE,
  readUInt32LE
};
function readUInt(input, bits, offset, isBigEndian) {
  offset = offset || 0;
  const endian = isBigEndian ? "BE" : "LE";
  const methodName = "readUInt" + bits + endian;
  return methods[methodName](input, offset);
}

const BMP = {
  validate: (input) => toUTF8String(input, 0, 2) === "BM",
  calculate: (input) => ({
    height: Math.abs(readInt32LE(input, 22)),
    width: readUInt32LE(input, 18)
  })
};

const TYPE_ICON = 1;
const SIZE_HEADER$1 = 2 + 2 + 2;
const SIZE_IMAGE_ENTRY = 1 + 1 + 1 + 1 + 2 + 2 + 4 + 4;
function getSizeFromOffset(input, offset) {
  const value = input[offset];
  return value === 0 ? 256 : value;
}
function getImageSize$1(input, imageIndex) {
  const offset = SIZE_HEADER$1 + imageIndex * SIZE_IMAGE_ENTRY;
  return {
    height: getSizeFromOffset(input, offset + 1),
    width: getSizeFromOffset(input, offset)
  };
}
const ICO = {
  validate(input) {
    const reserved = readUInt16LE(input, 0);
    const imageCount = readUInt16LE(input, 4);
    if (reserved !== 0 || imageCount === 0) {
      return false;
    }
    const imageType = readUInt16LE(input, 2);
    return imageType === TYPE_ICON;
  },
  calculate(input) {
    const nbImages = readUInt16LE(input, 4);
    const imageSize = getImageSize$1(input, 0);
    if (nbImages === 1) {
      return imageSize;
    }
    const imgs = [imageSize];
    for (let imageIndex = 1; imageIndex < nbImages; imageIndex += 1) {
      imgs.push(getImageSize$1(input, imageIndex));
    }
    return {
      height: imageSize.height,
      images: imgs,
      width: imageSize.width
    };
  }
};

const TYPE_CURSOR = 2;
const CUR = {
  validate(input) {
    const reserved = readUInt16LE(input, 0);
    const imageCount = readUInt16LE(input, 4);
    if (reserved !== 0 || imageCount === 0) {
      return false;
    }
    const imageType = readUInt16LE(input, 2);
    return imageType === TYPE_CURSOR;
  },
  calculate: (input) => ICO.calculate(input)
};

const DDS = {
  validate: (input) => readUInt32LE(input, 0) === 542327876,
  calculate: (input) => ({
    height: readUInt32LE(input, 12),
    width: readUInt32LE(input, 16)
  })
};

const gifRegexp = /^GIF8[79]a/;
const GIF = {
  validate: (input) => gifRegexp.test(toUTF8String(input, 0, 6)),
  calculate: (input) => ({
    height: readUInt16LE(input, 8),
    width: readUInt16LE(input, 6)
  })
};

const SIZE_HEADER = 4 + 4;
const FILE_LENGTH_OFFSET = 4;
const ENTRY_LENGTH_OFFSET = 4;
const ICON_TYPE_SIZE = {
  ICON: 32,
  "ICN#": 32,
  // m => 16 x 16
  "icm#": 16,
  icm4: 16,
  icm8: 16,
  // s => 16 x 16
  "ics#": 16,
  ics4: 16,
  ics8: 16,
  is32: 16,
  s8mk: 16,
  icp4: 16,
  // l => 32 x 32
  icl4: 32,
  icl8: 32,
  il32: 32,
  l8mk: 32,
  icp5: 32,
  ic11: 32,
  // h => 48 x 48
  ich4: 48,
  ich8: 48,
  ih32: 48,
  h8mk: 48,
  // . => 64 x 64
  icp6: 64,
  ic12: 32,
  // t => 128 x 128
  it32: 128,
  t8mk: 128,
  ic07: 128,
  // . => 256 x 256
  ic08: 256,
  ic13: 256,
  // . => 512 x 512
  ic09: 512,
  ic14: 512,
  // . => 1024 x 1024
  ic10: 1024
};
function readImageHeader(input, imageOffset) {
  const imageLengthOffset = imageOffset + ENTRY_LENGTH_OFFSET;
  return [
    toUTF8String(input, imageOffset, imageLengthOffset),
    readUInt32BE(input, imageLengthOffset)
  ];
}
function getImageSize(type) {
  const size = ICON_TYPE_SIZE[type];
  return { width: size, height: size, type };
}
const ICNS = {
  validate: (input) => toUTF8String(input, 0, 4) === "icns",
  calculate(input) {
    const inputLength = input.length;
    const fileLength = readUInt32BE(input, FILE_LENGTH_OFFSET);
    let imageOffset = SIZE_HEADER;
    let imageHeader = readImageHeader(input, imageOffset);
    let imageSize = getImageSize(imageHeader[0]);
    imageOffset += imageHeader[1];
    if (imageOffset === fileLength) {
      return imageSize;
    }
    const result = {
      height: imageSize.height,
      images: [imageSize],
      width: imageSize.width
    };
    while (imageOffset < fileLength && imageOffset < inputLength) {
      imageHeader = readImageHeader(input, imageOffset);
      imageSize = getImageSize(imageHeader[0]);
      imageOffset += imageHeader[1];
      result.images.push(imageSize);
    }
    return result;
  }
};

const J2C = {
  // TODO: this doesn't seem right. SIZ marker doesn't have to be right after the SOC
  validate: (input) => toHexString(input, 0, 4) === "ff4fff51",
  calculate: (input) => ({
    height: readUInt32BE(input, 12),
    width: readUInt32BE(input, 8)
  })
};

const BoxTypes = {
  ftyp: "66747970",
  ihdr: "69686472",
  jp2h: "6a703268",
  jp__: "6a502020",
  rreq: "72726571",
  xml_: "786d6c20"
};
const calculateRREQLength = (box) => {
  const unit = box[0];
  let offset = 1 + 2 * unit;
  const numStdFlags = readUInt16BE(box, offset);
  const flagsLength = numStdFlags * (2 + unit);
  offset = offset + 2 + flagsLength;
  const numVendorFeatures = readUInt16BE(box, offset);
  const featuresLength = numVendorFeatures * (16 + unit);
  return offset + 2 + featuresLength;
};
const parseIHDR = (box) => {
  return {
    height: readUInt32BE(box, 4),
    width: readUInt32BE(box, 8)
  };
};
const JP2 = {
  validate(input) {
    const signature = toHexString(input, 4, 8);
    const signatureLength = readUInt32BE(input, 0);
    if (signature !== BoxTypes.jp__ || signatureLength < 1) {
      return false;
    }
    const ftypeBoxStart = signatureLength + 4;
    const ftypBoxLength = readUInt32BE(input, signatureLength);
    const ftypBox = input.slice(ftypeBoxStart, ftypeBoxStart + ftypBoxLength);
    return toHexString(ftypBox, 0, 4) === BoxTypes.ftyp;
  },
  calculate(input) {
    const signatureLength = readUInt32BE(input, 0);
    const ftypBoxLength = readUInt16BE(input, signatureLength + 2);
    let offset = signatureLength + 4 + ftypBoxLength;
    const nextBoxType = toHexString(input, offset, offset + 4);
    switch (nextBoxType) {
      case BoxTypes.rreq: {
        const MAGIC = 4;
        offset = offset + 4 + MAGIC + calculateRREQLength(input.slice(offset + 4));
        return parseIHDR(input.slice(offset + 8, offset + 24));
      }
      case BoxTypes.jp2h: {
        return parseIHDR(input.slice(offset + 8, offset + 24));
      }
      default: {
        throw new TypeError(
          "Unsupported header found: " + toUTF8String(input, offset, offset + 4)
        );
      }
    }
  }
};

const EXIF_MARKER = "45786966";
const APP1_DATA_SIZE_BYTES = 2;
const EXIF_HEADER_BYTES = 6;
const TIFF_BYTE_ALIGN_BYTES = 2;
const BIG_ENDIAN_BYTE_ALIGN = "4d4d";
const LITTLE_ENDIAN_BYTE_ALIGN = "4949";
const IDF_ENTRY_BYTES = 12;
const NUM_DIRECTORY_ENTRIES_BYTES = 2;
function isEXIF(input) {
  return toHexString(input, 2, 6) === EXIF_MARKER;
}
function extractSize(input, index) {
  return {
    height: readUInt16BE(input, index),
    width: readUInt16BE(input, index + 2)
  };
}
function extractOrientation(exifBlock, isBigEndian) {
  const idfOffset = 8;
  const offset = EXIF_HEADER_BYTES + idfOffset;
  const idfDirectoryEntries = readUInt(exifBlock, 16, offset, isBigEndian);
  for (let directoryEntryNumber = 0; directoryEntryNumber < idfDirectoryEntries; directoryEntryNumber++) {
    const start = offset + NUM_DIRECTORY_ENTRIES_BYTES + directoryEntryNumber * IDF_ENTRY_BYTES;
    const end = start + IDF_ENTRY_BYTES;
    if (start > exifBlock.length) {
      return;
    }
    const block = exifBlock.slice(start, end);
    const tagNumber = readUInt(block, 16, 0, isBigEndian);
    if (tagNumber === 274) {
      const dataFormat = readUInt(block, 16, 2, isBigEndian);
      if (dataFormat !== 3) {
        return;
      }
      const numberOfComponents = readUInt(block, 32, 4, isBigEndian);
      if (numberOfComponents !== 1) {
        return;
      }
      return readUInt(block, 16, 8, isBigEndian);
    }
  }
}
function validateExifBlock(input, index) {
  const exifBlock = input.slice(APP1_DATA_SIZE_BYTES, index);
  const byteAlign = toHexString(
    exifBlock,
    EXIF_HEADER_BYTES,
    EXIF_HEADER_BYTES + TIFF_BYTE_ALIGN_BYTES
  );
  const isBigEndian = byteAlign === BIG_ENDIAN_BYTE_ALIGN;
  const isLittleEndian = byteAlign === LITTLE_ENDIAN_BYTE_ALIGN;
  if (isBigEndian || isLittleEndian) {
    return extractOrientation(exifBlock, isBigEndian);
  }
}
function validateInput(input, index) {
  if (index > input.length) {
    throw new TypeError("Corrupt JPG, exceeded buffer limits");
  }
  if (input[index] !== 255) {
    throw new TypeError("Invalid JPG, marker table corrupted");
  }
}
const JPG = {
  validate: (input) => toHexString(input, 0, 2) === "ffd8",
  calculate(input) {
    input = input.slice(4);
    let orientation;
    let next;
    while (input.length > 0) {
      const i = readUInt16BE(input, 0);
      if (isEXIF(input)) {
        orientation = validateExifBlock(input, i);
      }
      validateInput(input, i);
      next = input[i + 1];
      if (next === 192 || next === 193 || next === 194) {
        const size = extractSize(input, i + 5);
        if (!orientation) {
          return size;
        }
        return {
          height: size.height,
          orientation,
          width: size.width
        };
      }
      input = input.slice(i + 2);
    }
    throw new TypeError("Invalid JPG, no size found");
  }
};

const KTX = {
  validate: (input) => toUTF8String(input, 1, 7) === "KTX 11",
  calculate: (input) => ({
    height: readUInt32LE(input, 40),
    width: readUInt32LE(input, 36)
  })
};

const pngSignature = "PNG\r\n\n";
const pngImageHeaderChunkName = "IHDR";
const pngFriedChunkName = "CgBI";
const PNG = {
  validate(input) {
    if (pngSignature === toUTF8String(input, 1, 8)) {
      let chunkName = toUTF8String(input, 12, 16);
      if (chunkName === pngFriedChunkName) {
        chunkName = toUTF8String(input, 28, 32);
      }
      if (chunkName !== pngImageHeaderChunkName) {
        throw new TypeError("Invalid PNG");
      }
      return true;
    }
    return false;
  },
  calculate(input) {
    if (toUTF8String(input, 12, 16) === pngFriedChunkName) {
      return {
        height: readUInt32BE(input, 36),
        width: readUInt32BE(input, 32)
      };
    }
    return {
      height: readUInt32BE(input, 20),
      width: readUInt32BE(input, 16)
    };
  }
};

const PNMTypes = {
  P1: "pbm/ascii",
  P2: "pgm/ascii",
  P3: "ppm/ascii",
  P4: "pbm",
  P5: "pgm",
  P6: "ppm",
  P7: "pam",
  PF: "pfm"
};
const handlers = {
  default: (lines) => {
    let dimensions = [];
    while (lines.length > 0) {
      const line = lines.shift();
      if (line[0] === "#") {
        continue;
      }
      dimensions = line.split(" ");
      break;
    }
    if (dimensions.length === 2) {
      return {
        height: Number.parseInt(dimensions[1], 10),
        width: Number.parseInt(dimensions[0], 10)
      };
    } else {
      throw new TypeError("Invalid PNM");
    }
  },
  pam: (lines) => {
    const size = {};
    while (lines.length > 0) {
      const line = lines.shift();
      if (line.length > 16 || (line.codePointAt(0) || 0) > 128) {
        continue;
      }
      const [key, value] = line.split(" ");
      if (key && value) {
        size[key.toLowerCase()] = Number.parseInt(value, 10);
      }
      if (size.height && size.width) {
        break;
      }
    }
    if (size.height && size.width) {
      return {
        height: size.height,
        width: size.width
      };
    } else {
      throw new TypeError("Invalid PAM");
    }
  }
};
const PNM = {
  validate: (input) => toUTF8String(input, 0, 2) in PNMTypes,
  calculate(input) {
    const signature = toUTF8String(input, 0, 2);
    const type = PNMTypes[signature];
    const lines = toUTF8String(input, 3).split(/[\n\r]+/);
    const handler = handlers[type] || handlers.default;
    return handler(lines);
  }
};

const PSD = {
  validate: (input) => toUTF8String(input, 0, 4) === "8BPS",
  calculate: (input) => ({
    height: readUInt32BE(input, 14),
    width: readUInt32BE(input, 18)
  })
};

const svgReg = /<svg\s([^"'>]|"[^"]*"|'[^']*')*>/;
const extractorRegExps = {
  height: /\sheight=(["'])([^%]+?)\1/,
  root: svgReg,
  viewbox: /\sviewbox=(["'])(.+?)\1/i,
  width: /\swidth=(["'])([^%]+?)\1/
};
const INCH_CM = 2.54;
const units = {
  in: 96,
  cm: 96 / INCH_CM,
  em: 16,
  ex: 8,
  m: 96 / INCH_CM * 100,
  mm: 96 / INCH_CM / 10,
  pc: 96 / 72 / 12,
  pt: 96 / 72,
  px: 1
};
const unitsReg = new RegExp(
  `^([0-9.]+(?:e\\d+)?)(${Object.keys(units).join("|")})?$`
);
function parseLength(len) {
  const m = unitsReg.exec(len);
  if (!m) {
    return void 0;
  }
  return Math.round(Number(m[1]) * (units[m[2]] || 1));
}
function parseViewbox(viewbox) {
  const bounds = viewbox.split(" ");
  return {
    height: parseLength(bounds[3]),
    width: parseLength(bounds[2])
  };
}
function parseAttributes(root) {
  const width = root.match(extractorRegExps.width);
  const height = root.match(extractorRegExps.height);
  const viewbox = root.match(extractorRegExps.viewbox);
  return {
    height: height && parseLength(height[2]),
    viewbox: viewbox && parseViewbox(viewbox[2]),
    width: width && parseLength(width[2])
  };
}
function calculateByDimensions(attrs) {
  return {
    height: attrs.height,
    width: attrs.width
  };
}
function calculateByViewbox(attrs, viewbox) {
  const ratio = viewbox.width / viewbox.height;
  if (attrs.width) {
    return {
      height: Math.floor(attrs.width / ratio),
      width: attrs.width
    };
  }
  if (attrs.height) {
    return {
      height: attrs.height,
      width: Math.floor(attrs.height * ratio)
    };
  }
  return {
    height: viewbox.height,
    width: viewbox.width
  };
}
const SVG = {
  // Scan only the first kilo-byte to speed up the check on larger files
  validate: (input) => svgReg.test(toUTF8String(input, 0, 1e3)),
  calculate(input) {
    const root = toUTF8String(input).match(extractorRegExps.root);
    if (root) {
      const attrs = parseAttributes(root[0]);
      if (attrs.width && attrs.height) {
        return calculateByDimensions(attrs);
      }
      if (attrs.viewbox) {
        return calculateByViewbox(attrs, attrs.viewbox);
      }
    }
    throw new TypeError("Invalid SVG");
  }
};

const TGA = {
  validate(input) {
    return readUInt16LE(input, 0) === 0 && readUInt16LE(input, 4) === 0;
  },
  calculate(input) {
    return {
      height: readUInt16LE(input, 14),
      width: readUInt16LE(input, 12)
    };
  }
};

function readIFD(buffer, isBigEndian) {
  const ifdOffset = readUInt(buffer, 32, 4, isBigEndian);
  let bufferSize = 1024;
  const fileSize = buffer.length;
  if (ifdOffset + bufferSize > fileSize) {
    bufferSize = fileSize - ifdOffset - 10;
  }
  return buffer.slice(ifdOffset + 2, ifdOffset + 2 + bufferSize);
}
function readValue(buffer, isBigEndian) {
  const low = readUInt(buffer, 16, 8, isBigEndian);
  const high = readUInt(buffer, 16, 10, isBigEndian);
  return (high << 16) + low;
}
function nextTag(buffer) {
  if (buffer.length > 24) {
    return buffer.slice(12);
  }
}
function extractTags(buffer, isBigEndian) {
  const tags = {};
  let temp = buffer;
  while (temp && temp.length > 0) {
    const code = readUInt(temp, 16, 0, isBigEndian);
    const type = readUInt(temp, 16, 2, isBigEndian);
    const length = readUInt(temp, 32, 4, isBigEndian);
    if (code === 0) {
      break;
    } else {
      if (length === 1 && (type === 3 || type === 4)) {
        tags[code] = readValue(temp, isBigEndian);
      }
      temp = nextTag(temp);
    }
  }
  return tags;
}
function determineEndianness(input) {
  const signature = toUTF8String(input, 0, 2);
  if (signature === "II") {
    return "LE";
  } else if (signature === "MM") {
    return "BE";
  }
}
const signatures = /* @__PURE__ */ new Set([
  // '492049', // currently not supported
  "49492a00",
  // Little endian
  "4d4d002a"
  // Big Endian
  // '4d4d002a', // BigTIFF > 4GB. currently not supported
]);
const TIFF = {
  validate: (input) => signatures.has(toHexString(input, 0, 4)),
  calculate(input) {
    const isBigEndian = determineEndianness(input) === "BE";
    const ifdBuffer = readIFD(input, isBigEndian);
    const tags = extractTags(ifdBuffer, isBigEndian);
    const width = tags[256];
    const height = tags[257];
    if (!width || !height) {
      throw new TypeError("Invalid Tiff. Missing tags");
    }
    return { height, width };
  }
};

function calculateExtended(input) {
  return {
    height: 1 + readUInt24LE(input, 7),
    width: 1 + readUInt24LE(input, 4)
  };
}
function calculateLossless(input) {
  return {
    height: 1 + ((input[4] & 15) << 10 | input[3] << 2 | (input[2] & 192) >> 6),
    width: 1 + ((input[2] & 63) << 8 | input[1])
  };
}
function calculateLossy(input) {
  return {
    height: readInt16LE(input, 8) & 16383,
    width: readInt16LE(input, 6) & 16383
  };
}
const WEBP = {
  validate(input) {
    const riffHeader = toUTF8String(input, 0, 4) === "RIFF";
    const webpHeader = toUTF8String(input, 8, 12) === "WEBP";
    const vp8Header = toUTF8String(input, 12, 15) === "VP8";
    return riffHeader && webpHeader && vp8Header;
  },
  calculate(input) {
    const chunkHeader = toUTF8String(input, 12, 16);
    input = input.slice(20, 30);
    if (chunkHeader === "VP8X") {
      const extendedHeader = input[0];
      const validStart = (extendedHeader & 192) === 0;
      const validEnd = (extendedHeader & 1) === 0;
      if (validStart && validEnd) {
        return calculateExtended(input);
      } else {
        throw new TypeError("Invalid WebP");
      }
    }
    if (chunkHeader === "VP8 " && input[0] !== 47) {
      return calculateLossy(input);
    }
    const signature = toHexString(input, 3, 6);
    if (chunkHeader === "VP8L" && signature !== "9d012a") {
      return calculateLossless(input);
    }
    throw new TypeError("Invalid WebP");
  }
};

const AVIF = {
  validate: (input) => toUTF8String(input, 8, 12) === "avif",
  calculate: (input) => {
    const metaBox = findBox(input, "meta");
    const iprpBox = findBox(
      input,
      "iprp",
      metaBox.offset + 12,
      metaBox.offset + metaBox.size
    );
    const ipcoBox = findBox(
      input,
      "ipco",
      iprpBox.offset + 8,
      iprpBox.offset + iprpBox.size
    );
    const ispeBox = findBox(
      input,
      "ispe",
      ipcoBox.offset + 8,
      ipcoBox.offset + ipcoBox.size
    );
    const width = readUInt32BE(input, ispeBox.offset + 12);
    const height = readUInt32BE(input, ispeBox.offset + 16);
    return { width, height };
  }
};
function findBox(input, type, startOffset = 0, endOffset = input.length) {
  for (let offset = startOffset; offset < endOffset; ) {
    const size = readUInt32BE(input, offset);
    const boxType = toUTF8String(input, offset + 4, offset + 8);
    if (boxType === type) {
      return { offset, size };
    }
    if (size <= 0 || offset + size > endOffset) {
      break;
    }
    offset += size;
  }
  throw new Error(`${type} box not found`);
}

const typeHandlers = {
  bmp: BMP,
  cur: CUR,
  dds: DDS,
  gif: GIF,
  icns: ICNS,
  ico: ICO,
  j2c: J2C,
  jp2: JP2,
  jpg: JPG,
  ktx: KTX,
  png: PNG,
  pnm: PNM,
  psd: PSD,
  svg: SVG,
  tga: TGA,
  tiff: TIFF,
  webp: WEBP,
  avif: AVIF
};

const keys = Object.keys(typeHandlers);
const firstBytes = {
  56: "psd",
  66: "bmp",
  68: "dds",
  71: "gif",
  73: "tiff",
  77: "tiff",
  82: "webp",
  105: "icns",
  137: "png",
  255: "jpg"
};
function detector(input) {
  const byte = input[0];
  if (byte in firstBytes) {
    const type = firstBytes[byte];
    if (type && typeHandlers[type].validate(input)) {
      return type;
    }
  }
  return keys.find((key) => typeHandlers[key].validate(input));
}

function imageMeta(input) {
  if (!(input instanceof Uint8Array)) {
    throw new TypeError("Input should be a Uint8Array");
  }
  const type = detector(input);
  if (type !== void 0 && type in typeHandlers) {
    const size = typeHandlers[type].calculate(input);
    if (size !== void 0) {
      size.type = type;
      return size;
    }
  }
  throw new TypeError(`Unsupported file type: ${type}`);
}

const m=t=>Buffer.from(t).toString("hex"),y="1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5",k=10,b="https://ordinals.gorillapool.io/api";class I extends P2PKH{lock(o,e,n){const s=(new P2PKH).lock(o);return B(s,e,n)}}const B=(t,e,n,s=!1)=>{let r="";if(void 0!==(null==e?void 0:e.dataB64)&&void 0!==(null==e?void 0:e.contentType)){const t=m("ord"),o=Buffer.from(e.dataB64,"base64").toString("hex").trim();if(!o)throw new Error("Invalid file data");const n=m(e.contentType);if(!n)throw new Error("Invalid media type");r=`OP_0 OP_IF ${t} OP_1 ${n} OP_0 ${o} OP_ENDIF`;}let i=`${r?`${r} ${s?"OP_CODESEPARATOR ":""}`:""}${t.toASM()}`;if(n&&(!n.app||!n.type))throw new Error("MAP.app and MAP.type are required fields");if(null!=n&&n.app&&null!=n&&n.type){i=`${i?`${i} `:""}OP_RETURN ${m(y)} ${m("SET")}`;for(const[t,o]of Object.entries(n))"cmd"!==t&&(i=`${i} ${m(t)} ${m(o)}`);}return LockingScript.fromASM(i)};function S(){return S=Object.assign?Object.assign.bind():function(t){for(var o=1;o<arguments.length;o++){var e=arguments[o];for(var n in e)({}).hasOwnProperty.call(e,n)&&(t[n]=e[n]);}return t},S.apply(null,arguments)}exports.TokenSelectionStrategy = void 0;exports.TokenType = void 0;exports.RoytaltyType = void 0;exports.TokenInputMode = void 0;!function(t){t.SmallestFirst="smallest",t.LargestFirst="largest",t.RetainOrder="retain",t.Random="random";}(exports.TokenSelectionStrategy||(exports.TokenSelectionStrategy={})),function(t){t.BSV20="bsv20",t.BSV21="bsv21";}(exports.TokenType||(exports.TokenType={})),function(t){t.Paymail="paymail",t.Address="address",t.Script="script";}(exports.RoytaltyType||(exports.RoytaltyType={})),function(t){t.All="all",t.Needed="needed";}(exports.TokenInputMode||(exports.TokenInputMode={}));const A=2n**64n-1n,{fromBase58Check:P}=n$1,$=(t,o)=>fromUtxo(S({},t,{script:Buffer.from(t.script,"base64").toString("hex")}),o),T=async(o,e="base64")=>{const n=`${b}/txos/address/${o}/unspent?bsv20=false`;console.log({payUrl:n});const s=await fetch(n);if(!s.ok)throw new Error("Error fetching pay utxos");let r=await s.json();r=r.filter(t=>1!==t.satoshis&&!C(t));const i=P(o),a=(new P2PKH).lock(i.data);return r=r.map(t=>({txid:t.txid,vout:t.vout,satoshis:t.satoshis,script:"hex"===e||"base64"===e?Buffer.from(a.toBinary()).toString(e):a.toASM()})),r},N=async(t,o,n=10,s=0,r="base64")=>{let i=`${b}/txos/address/${t}/unspent?limit=${n}&offset=${s}&`;o&&(i+=`q=${Buffer.from(JSON.stringify({map:{subTypeData:{collectionId:o}}})).toString("base64")}`);const a=await fetch(i);if(!a.ok)throw new Error(`Error fetching NFT utxos for ${t}`);let c=await a.json();c=c.filter(t=>{var o;return 1===t.satoshis&&!(null!=(o=t.data)&&o.list)});const u=c.map(t=>`${t.txid}_${t.vout}`),d=await fetch(`${b}/txos/outpoints?script=true`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify([...u])});if(!d.ok)throw new Error(`Error fetching NFT scripts for ${t}`);return c=(await d.json()||[]).map(t=>{let n=t.script;"hex"===r?n=Buffer.from(n,"base64").toString("hex"):"asm"===r&&(n=Script.fromHex(Buffer.from(n,"base64").toString("hex")).toASM());const s={origin:t.origin.outpoint,script:n,vout:t.vout,txid:t.txid,satoshis:1};return o&&(s.collectionId=o),s}),c},q=async(t,o,e,n=10,s=0)=>{const r=`${b}/bsv20/${e}/${t===exports.TokenType.BSV20?"tick":"id"}/${o}?bsv20=true&listing=false&limit=${n}&offset=${s}`,i=await fetch(r);if(!i.ok)throw new Error(`Error fetching ${t} utxos`);let a=await i.json();return a=a.map(t=>({amt:t.amt,script:t.script,vout:t.vout,txid:t.txid,id:o,satoshis:1})),a},C=t=>!!t.lock,_=(t,o,e,n$1={})=>{const{inputStrategy:s=exports.TokenSelectionStrategy.RetainOrder,outputStrategy:r=exports.TokenSelectionStrategy.RetainOrder}=n$1,i=[...t].sort((t,o)=>{if(s===exports.TokenSelectionStrategy.RetainOrder)return 0;const e=BigInt(t.amt),n=BigInt(o.amt);switch(s){case exports.TokenSelectionStrategy.SmallestFirst:return Number(e-n);case exports.TokenSelectionStrategy.LargestFirst:return Number(n-e);case exports.TokenSelectionStrategy.Random:return Math.random()-.5;default:return 0}});let a=0;const c=[];for(const t of i)if(c.push(t),a+=n(t.amt,e),a>=o&&o>0)break;return r!==exports.TokenSelectionStrategy.RetainOrder&&c.sort((t,o)=>{const e=BigInt(t.amt),n=BigInt(o.amt);switch(r){case exports.TokenSelectionStrategy.SmallestFirst:return Number(e-n);case exports.TokenSelectionStrategy.LargestFirst:return Number(n-e);case exports.TokenSelectionStrategy.Random:return Math.random()-.5;default:return 0}}),{selectedUtxos:c,totalSelected:a,isEnough:a>=o}},F=async(t,o)=>{const e=null==o?void 0:o.idKey,n=null==o?void 0:o.keyHost;if(e){const o=new l(t),{signedTx:n}=o.sign(e);return n}if(n){const e=null==o?void 0:o.authToken,s=new l(t);try{const{signedTx:t}=await s.remoteSign(n,e);return t}catch(t){throw console.log(t),new Error(`Remote signing to ${n} failed`)}}throw new Error("Signer must be a LocalSigner or RemoteSigner")},D=t=>{if(!t)return;const o={app:t.app,type:t.type};for(const[e,n]of Object.entries(t))void 0!==n&&(o[e]="string"==typeof n?n:Array.isArray(n)||"object"==typeof n?JSON.stringify(n):String(n));return o},L=async o=>{const{utxos:s,destinations:a,paymentPk:c,satsPerKb:u=k,metaData:d,signer:f,additionalPayments:l=[]}=o;a.length>100&&console.warn("Creating many inscriptions at once can be slow. Consider using multiple transactions instead.");const p=new SatoshisPerKilobyte(u);let h,g=new Transaction;for(const t of a){if(!t.inscription)throw new Error("Inscription is required for all destinations");if(d)for(const t of Object.keys(d))void 0===d[t]&&delete d[t];g.addOutput({satoshis:1,lockingScript:(new I).lock(t.address,t.inscription,D(d))});}for(const o of l)g.addOutput({satoshis:o.amount,lockingScript:(new P2PKH).lock(o.to)});const w=o.changeAddress||(null==c?void 0:c.toAddress());if(!w)throw new Error("Either changeAddress or paymentPk is required");const m=(new P2PKH).lock(w);g.addOutput({lockingScript:m,change:!0});let y=0n;const b=g.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);if(f){const o=s.pop(),r=o.pk||c;if(!r)throw new Error("Private key is required to sign the transaction");g.addInput($(o,(new P2PKH).unlock(r,"all",!0,o.satoshis,Script.fromBinary(toArray(o.script,"base64"))))),y+=BigInt(o.satoshis),g=await F(g,f);}let B=0;for(const o of s){const s=o.pk||c;if(!s)throw new Error("Private key is required to sign the transaction");if(y>=b+BigInt(B))break;const r=$(o,(new P2PKH).unlock(s,"all",!0,o.satoshis,Script.fromBinary(toArray(o.script,"base64"))));g.addInput(r),y+=BigInt(o.satoshis),B=await p.computeFee(g);}if(y<b+BigInt(B))throw new Error(`Not enough funds to create ordinals. Total sats in: ${y}, Total sats out: ${b}, Fee: ${B}`);await g.fee(p),await g.sign();const S=g.outputs.findIndex(t=>t.change);if(-1!==S){const t=g.outputs[S];h={satoshis:t.satoshis,txid:g.id("hex"),vout:S,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")};}return h&&(h.satoshis=g.outputs[g.outputs.length-1].satoshis,h.txid=g.id("hex")),{tx:g,spentOutpoints:s.map(t=>`${t.txid}_${t.vout}`),payChange:h}},R=async o=>{o.satsPerKb||(o.satsPerKb=k),o.additionalPayments||(o.additionalPayments=[]),void 0===o.enforceUniformSend&&(o.enforceUniformSend=!0);const{ordPk:s,paymentPk:a}=o,c=new SatoshisPerKilobyte(o.satsPerKb);let u=new Transaction;const d=[];for(const t of o.ordinals){const o=t.pk||s;if(!o)throw new Error("Private key is required to sign the ordinal");if(1!==t.satoshis)throw new Error("1Sat Ordinal utxos must have exactly 1 satoshi");const r=$(t,(new I).unlock(o,"all",!0,t.satoshis,Script.fromBinary(toArray(t.script,"base64"))));d.push(`${t.txid}_${t.vout}`),u.addInput(r);}if(o.enforceUniformSend&&o.destinations.length!==o.ordinals.length)throw new Error("Number of destinations must match number of ordinals being sent");for(const e of o.destinations){var f,l;let n;n=null!=(f=e.inscription)&&f.dataB64&&null!=(l=e.inscription)&&l.contentType?(new I).lock(e.address,e.inscription,D(o.metaData)):(new P2PKH).lock(e.address),u.addOutput({satoshis:1,lockingScript:n});}for(const e of o.additionalPayments)u.addOutput({satoshis:e.amount,lockingScript:(new P2PKH).lock(e.to)});let p;const h=o.changeAddress||(null==a?void 0:a.toAddress());if(!h)throw new Error("Either changeAddress or paymentPk is required");const g=(new P2PKH).lock(h);u.addOutput({lockingScript:g,change:!0});let w=0n;const m=u.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let y=0;for(const s of o.paymentUtxos){const o=s.pk||a;if(!o)throw new Error("Private key is required to sign the payment");const r=$(s,(new P2PKH).unlock(o,"all",!0,s.satoshis,Script.fromBinary(toArray(s.script,"base64"))));if(d.push(`${s.txid}_${s.vout}`),u.addInput(r),w+=BigInt(s.satoshis),y=await c.computeFee(u),w>=m+BigInt(y))break}if(w<m)throw new Error("Not enough ordinals to send");o.signer&&(u=await F(u,o.signer)),await u.fee(c),await u.sign();const b=u.outputs.findIndex(t=>t.change);if(-1!==b){const t=u.outputs[b];p={satoshis:t.satoshis,txid:u.id("hex"),vout:b,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")};}return p&&(p.satoshis=u.outputs[u.outputs.length-1].satoshis,p.txid=u.id("hex")),{tx:u,spentOutpoints:d,payChange:p}},U=async o=>{const{utxos:s,paymentPk:a,payments:c,satsPerKb:u=k,metaData:d}=o,f=new SatoshisPerKilobyte(u),l=new Transaction;for(const t of c){const o={satoshis:t.amount,lockingScript:(new I).lock(t.to,void 0,d)};l.addOutput(o);}let p=0n;const h=l.outputs.reduce((t,o)=>t+(o.satoshis||0),0);let g,w=0;for(const o of s){const s=o.pk||a;if(!s)throw new Error("Private key is required to sign the utxos");const r=$(o,(new P2PKH).unlock(s,"all",!0,o.satoshis,Script.fromBinary(toArray(o.script,"base64"))));if(l.addInput(r),p+=BigInt(o.satoshis),w=await f.computeFee(l),p>=h+w)break}if(p<h+w)throw new Error(`Not enough funds to send. Total sats in: ${p}, Total sats out: ${h}, Fee: ${w}`);if(p>h+w){const e=o.changeAddress||(null==a?void 0:a.toAddress());if(!e)throw new Error("Either changeAddress or paymentPk is required");const n=(new P2PKH).lock(e),s={lockingScript:n,change:!0};g={txid:"",vout:l.outputs.length,satoshis:0,script:Buffer.from(n.toHex(),"hex").toString("base64")},l.addOutput(s);}else p<h+w&&console.log("No change needed");await l.fee(f),await l.sign();const m=l.outputs.findIndex(t=>t.change);if(-1!==m){const t=l.outputs[m];g={satoshis:t.satoshis,txid:l.id("hex"),vout:m,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")};}return g&&(g.satoshis=l.outputs[l.outputs.length-1].satoshis,g.txid=l.id("hex")),{tx:l,spentOutpoints:s.map(t=>`${t.txid}_${t.vout}`),payChange:g}},j=async o=>{const{protocol:s,tokenID:a,utxos:c,inputTokens:u,distributions:d,paymentPk:f,ordPk:l,satsPerKb:g=k,metaData:w,signer:m,decimals:y,additionalPayments:b=[],burn:B=!1,tokenInputMode:x=exports.TokenInputMode.Needed,splitConfig:E={outputs:1,omitMetaData:!1}}=o;if(!u.every(t=>t.id===a))throw new Error("Input tokens do not match the provided tokenID");let A=0n,P=0n,T=0n;const N=d.reduce((t,o)=>t+i(o.tokens,y,e.BigInt),0n),q=new SatoshisPerKilobyte(g);let C,_=new Transaction;if(x===exports.TokenInputMode.All)C=u,P=u.reduce((t,o)=>t+BigInt(o.amt),0n);else {C=[];for(const t of u)if(C.push(t),P+=BigInt(t.amt),P>=N)break;if(P<N)throw new Error("Not enough tokens to satisfy the transfer amount")}for(const t of C){const o=t.pk||l;if(!o)throw new Error("Private key required for token input");const s=toArray(t.script,"base64"),r=Script.fromBinary(s);_.addInput($(t,(new I).unlock(o,"all",!0,t.satoshis,r)));}if(w)for(const t of Object.keys(w))void 0===w[t]&&delete w[t];for(const t of d){const o=i(t.tokens,y,e.BigInt);console.log({distTokenSat:o});const e$1={p:"bsv-20",op:B?"burn":"transfer",amt:o.toString()};let n;if(s===exports.TokenType.BSV20)n=S({},e$1,{tick:a});else {if(s!==exports.TokenType.BSV21)throw new Error("Invalid protocol");n=S({},e$1,{id:a});}_.addOutput({satoshis:1,lockingScript:(new I).lock(t.address,{dataB64:Buffer.from(JSON.stringify(n)).toString("base64"),contentType:"application/bsv-20"},t.omitMetaData?void 0:D(w))}),T+=o;}if(A=P-T,A<0n)throw new Error("Not enough tokens to send");let L,R=[];if(A>0n){const t=o.tokenChangeAddress||(null==l?void 0:l.toAddress());if(!t)throw new Error("ordPk or changeAddress required for token change");R=M(_,A,s,a,t,w,E,y);}for(const o of b)_.addOutput({satoshis:o.amount,lockingScript:(new P2PKH).lock(o.to)});const U=o.changeAddress||(null==f?void 0:f.toAddress());if(!U)throw new Error("paymentPk or changeAddress required for payment change");const j=(new P2PKH).lock(U);_.addOutput({lockingScript:j,change:!0});let K=0n;const V=_.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let H=0;for(const o of c){const s=o.pk||f;if(!s)throw new Error("paymentPk required for payment utxo");const r=$(o,(new P2PKH).unlock(s,"all",!0,o.satoshis,Script.fromBinary(toArray(o.script,"base64"))));if(_.addInput(r),K+=BigInt(o.satoshis),H=await q.computeFee(_),K>=V+BigInt(H))break}if(K<V+BigInt(H))throw new Error(`Not enough funds to transfer tokens. Total sats in: ${K}, Total sats out: ${V}, Fee: ${H}`);m&&(_=await F(_,m)),await _.fee(q),await _.sign();const J=_.id("hex");for(const t of R)t.txid=J;const X=_.outputs.findIndex(t=>t.change);if(-1!==X){const t=_.outputs[X];L={satoshis:t.satoshis,txid:J,vout:X,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")};}return L&&(L.satoshis=_.outputs[_.outputs.length-1].satoshis,L.txid=_.id("hex")),{tx:_,spentOutpoints:_.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:L,tokenChange:R}},M=(t,o,e$1,n,s,r,i$1,a)=>{const c=[],u=void 0!==i$1.threshold?i(i$1.threshold,a,e.BigInt):void 0,d=i$1.outputs,f=o;let l;console.log({splitChangeAmt:f}),void 0!==u&&u>0n?(l=f/u,l=BigInt(Math.min(Number(l),d))):l=BigInt(d),l=BigInt(Math.max(Number(l),1));const g=f/l;let w=f%l;for(let o=0n;o<l;o++){let o=g;w>0n&&(o+=1n,w-=1n);const a={p:"bsv-20",op:"transfer",amt:o.toString()};let u;if(e$1===exports.TokenType.BSV20)u=S({},a,{tick:n});else {if(e$1!==exports.TokenType.BSV21)throw new Error("Invalid protocol");u=S({},a,{id:n});}const d=(new I).lock(s,{dataB64:Buffer.from(JSON.stringify(u)).toString("base64"),contentType:"application/bsv-20"},i$1.omitMetaData?void 0:D(r)),f=t.outputs.length;t.addOutput({lockingScript:d,satoshis:1}),c.push({id:n,satoshis:1,script:Buffer.from(d.toBinary()).toString("base64"),txid:"",vout:f,amt:o.toString()});}return c},K=(t,o)=>{try{if("collection"===t){const t=o;if(!t.description)return new Error("Collection description is required");if(!t.quantity)return new Error("Collection quantity is required");if(t.rarityLabels){if(!Array.isArray(t.rarityLabels))return new Error("Rarity labels must be an array");if(!t.rarityLabels.every(t=>Object.values(t).every(t=>"string"==typeof t)))return new Error(`Invalid rarity labels ${t.rarityLabels}`)}if(t.traits){if("object"!=typeof t.traits)return new Error("Collection traits must be an object");if(t.traits&&!Object.keys(t.traits).every(o=>"string"==typeof o&&"object"==typeof t.traits[o]))return new Error("Collection traits must be a valid CollectionTraits object")}}if("collectionItem"===t){const t=o;if(!t.collectionId)return new Error("Collection id is required");if(!t.collectionId.includes("_"))return new Error("Collection id must be a valid outpoint");if(64!==t.collectionId.split("_")[0].length)return new Error("Collection id must contain a valid txid");if(Number.isNaN(Number.parseInt(t.collectionId.split("_")[1])))return new Error("Collection id must contain a valid vout");if(t.mintNumber&&"number"!=typeof t.mintNumber)return new Error("Mint number must be a number");if(t.rank&&"number"!=typeof t.rank)return new Error("Rank must be a number");if(t.rarityLabel&&"string"!=typeof t.rarityLabel)return new Error("Rarity label must be a string");if(t.traits&&"object"!=typeof t.traits)return new Error("Traits must be an object");if(t.attachments&&!Array.isArray(t.attachments))return new Error("Attachments must be an array")}return}catch(t){return new Error("Invalid JSON data")}};class V{lock(o,s,r,i){const a=fromBase58Check(o).data,c=fromBase58Check(s).data;let u=new Script;if(void 0!==(null==i?void 0:i.dataB64)&&void 0!==(null==i?void 0:i.contentType)){const t=m("ord"),o=Buffer.from(i.dataB64,"base64").toString("hex").trim();if(!o)throw new Error("Invalid file data");const n=m(i.contentType);if(!n)throw new Error("Invalid media type");u=Script.fromASM(`OP_0 OP_IF ${t} OP_1 ${n} OP_0 ${o} OP_ENDIF`);}return u.writeScript(Script.fromHex("2097dfd76851bf465e8f715593b217714858bbe9570ff3bd5e33840a34e20ff0262102ba79df5f8ae7604a9830f03c7933028186aede0675a16f025dc4f8be8eec0382201008ce7480da41702918d1ec8e6849ba32b4d65b1e40dc669c31a1e6306b266c0000")).writeBin(a).writeBin(V.buildOutput(r,(new P2PKH).lock(c).toBinary())).writeScript(Script.fromHex("615179547a75537a537a537a0079537a75527a527a7575615579008763567901c161517957795779210ac407f0e4bd44bfc207355a778b046225a7068fc59ee7eda43ad905aadbffc800206c266b30e6a1319c66dc401e5bd6b432ba49688eecd118297041da8074ce081059795679615679aa0079610079517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01007e81517a75615779567956795679567961537956795479577995939521414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff00517951796151795179970079009f63007952799367007968517a75517a75517a7561527a75517a517951795296a0630079527994527a75517a6853798277527982775379012080517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01205279947f7754537993527993013051797e527e54797e58797e527e53797e52797e57797e0079517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a756100795779ac517a75517a75517a75517a75517a75517a75517a75517a75517a7561517a75517a756169587951797e58797eaa577961007982775179517958947f7551790128947f77517a75517a75618777777777777777777767557951876351795779a9876957795779ac777777777777777767006868"))}cancelListing(o,e="all",n=!1,s,r){const i=(new P2PKH).unlock(o,e,n,s,r);return {sign:async function(t,o){return (await i.sign(t,o)).writeOpCode(OP.OP_1)},estimateLength:async function(){return 107}}}purchaseListing(t,o){const e={sign:async function(e,s){var r;if(e.outputs.length<2)throw new Error("Malformed transaction");const i=(new UnlockingScript).writeBin(V.buildOutput(e.outputs[0].satoshis||0,e.outputs[0].lockingScript.toBinary()));if(e.outputs.length>2){const t=new Writer;for(const o of e.outputs.slice(2))t.write(V.buildOutput(o.satoshis||0,o.lockingScript.toBinary()));i.writeBin(t.toArray());}else i.writeOpCode(OP.OP_0);const c=e.inputs[s];let f=t;if(!f&&c.sourceTransaction)f=c.sourceTransaction.outputs[c.sourceOutputIndex].satoshis;else if(!t)throw new Error("sourceTransaction or sourceSatoshis is required");const l=c.sourceTXID||(null==(r=c.sourceTransaction)?void 0:r.id("hex"));let p=o;var h;p||(p=null==(h=c.sourceTransaction)?void 0:h.outputs[c.sourceOutputIndex].lockingScript);const g=TransactionSignature.format({sourceTXID:l,sourceOutputIndex:c.sourceOutputIndex,sourceSatoshis:f,transactionVersion:e.version,otherInputs:[],inputIndex:s,outputs:e.outputs,inputSequence:c.sequence,subscript:p,lockTime:e.lockTime,scope:TransactionSignature.SIGHASH_ALL|TransactionSignature.SIGHASH_ANYONECANPAY|TransactionSignature.SIGHASH_FORKID});return i.writeBin(g).writeOpCode(OP.OP_0)},estimateLength:async function(t,o){return (await e.sign(t,o)).toBinary().length}};return e}static buildOutput(t,o){const e=new Writer;return e.writeUInt64LEBn(new BigNumber(t)),e.writeVarIntNum(o.length),e.write(o),e.toArray()}}const {toArray:H}=n$1,J=async o=>{const{utxos:s,listings:a,paymentPk:c,ordPk:u,satsPerKb:d=k,additionalPayments:f=[]}=o,l=new SatoshisPerKilobyte(d),p=new Transaction;a.length>100&&console.warn("Creating many inscriptions at once can be slow. Consider using multiple transactions instead.");for(const t of a){p.addOutput({satoshis:1,lockingScript:(new V).lock(t.ordAddress,t.payAddress,t.price)});const o=H(t.listingUtxo.script,"base64"),n=Script.fromBinary(o),s=t.listingUtxo.pk||u;if(!s)throw new Error("Private key is required to sign the ordinal");p.addInput($(t.listingUtxo,(new I).unlock(s,"all",!0,t.listingUtxo.satoshis,n)));}for(const o of f)p.addOutput({satoshis:o.amount,lockingScript:(new P2PKH).lock(o.to)});let h;const g=o.changeAddress||(null==c?void 0:c.toAddress());if(!g)throw new Error("changeAddress or private key is required");const w=(new P2PKH).lock(g);p.addOutput({lockingScript:w,change:!0});let m=0n;const y=p.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let b=0;for(const o of s){const s=o.pk||c;if(!s)throw new Error("Private key is required to sign the transaction");const r=$(o,(new P2PKH).unlock(s,"all",!0,o.satoshis,Script.fromBinary(toArray(o.script,"base64"))));if(p.addInput(r),m+=BigInt(o.satoshis),b=await l.computeFee(p),m>=y+BigInt(b))break}if(m<y+BigInt(b))throw new Error(`Not enough funds to create ordinal listings. Total sats in: ${m}, Total sats out: ${y}, Fee: ${b}`);await p.fee(l),await p.sign();const B=p.outputs.findIndex(t=>t.change);if(-1!==B){const t=p.outputs[B];h={satoshis:t.satoshis,txid:p.id("hex"),vout:B,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")};}return h&&(h.satoshis=p.outputs[p.outputs.length-1].satoshis,h.txid=p.id("hex")),{tx:p,spentOutpoints:p.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:h}},X=async o=>{const{utxos:s,protocol:a,tokenID:c,ordPk:u,paymentPk:d,additionalPayments:f=[],tokenChangeAddress:l,inputTokens:g,listings:w,decimals:m,satsPerKb:y=k}=o;if(w.length>100&&console.warn("Creating many inscriptions at once can be slow. Consider using multiple transactions instead."),!g.every(t=>t.id===c))throw new Error("Input tokens do not match the provided tokenID");let b=0n,B=0n,x=0n;if(!g.every(t=>t.id===c))throw new Error("Input tokens do not match the provided tokenID");const E=new SatoshisPerKilobyte(y),O=new Transaction;for(const t of w){const o=i(t.tokens,m,e.BigInt),e$1={p:"bsv-20",op:"transfer",amt:o.toString()};let n;if(a===exports.TokenType.BSV20)n=S({},e$1,{tick:c});else {if(a!==exports.TokenType.BSV21)throw new Error("Invalid protocol");n=S({},e$1,{id:c});}O.addOutput({satoshis:1,lockingScript:(new V).lock(t.ordAddress,t.payAddress,t.price,{dataB64:Buffer.from(JSON.stringify(n)).toString("base64"),contentType:"application/bsv-20"})}),x+=o;}for(const t of g){const o=t.pk||u;if(!o)throw new Error("Private key is required to sign the ordinal");O.addInput($(t,(new I).unlock(o,"all",!0,t.satoshis,Script.fromBinary(H(t.script,"base64"))))),B+=BigInt(t.amt);}let A,P;if(b=B-x,b<0n)throw new Error("Not enough tokens to send");if(b>0n){const t={p:"bsv-20",op:"transfer",amt:b.toString()};let o;if(a===exports.TokenType.BSV20)o=S({},t,{tick:c});else {if(a!==exports.TokenType.BSV21)throw new Error("Invalid protocol");o=S({},t,{id:c});}const e=(new I).lock(l,{dataB64:Buffer.from(JSON.stringify(o)).toString("base64"),contentType:"application/bsv-20"}),n=O.outputs.length;O.addOutput({lockingScript:e,satoshis:1}),A=[{id:c,satoshis:1,script:Buffer.from(e.toBinary()).toString("base64"),txid:"",vout:n,amt:b.toString()}];}for(const o of f)O.addOutput({satoshis:o.amount,lockingScript:(new P2PKH).lock(o.to)});const T=o.changeAddress||(null==d?void 0:d.toAddress());if(!T)throw new Error("Either changeAddress or paymentPk is required");const N=(new P2PKH).lock(T);O.addOutput({lockingScript:N,change:!0});let q=0n;const C=O.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let _=0;for(const o of s){const s=o.pk||d;if(!s)throw new Error("Private key is required to sign the payment");const r=$(o,(new P2PKH).unlock(s,"all",!0,o.satoshis,Script.fromBinary(toArray(o.script,"base64"))));if(O.addInput(r),q+=BigInt(o.satoshis),_=await E.computeFee(O),q>=C+BigInt(_))break}if(q<C+BigInt(_))throw new Error(`Not enough funds to create token listings. Total sats in: ${q}, Total sats out: ${C}, Fee: ${_}`);await O.fee(E),await O.sign();const F=O.id("hex");A&&(A=A.map(t=>S({},t,{txid:F})));const D=O.outputs.findIndex(t=>t.change);if(-1!==D){const t=O.outputs[D];P={satoshis:t.satoshis,txid:F,vout:D,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")};}return P&&(P.satoshis=O.outputs[O.outputs.length-1].satoshis,P.txid=O.id("hex")),{tx:O,spentOutpoints:O.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:P,tokenChange:A}},W=async o=>{const{utxos:s,listingUtxos:a,ordPk:c,paymentPk:u,additionalPayments:d=[],satsPerKb:f=k}=o;a.length>100&&console.warn("Creating many inscriptions at once can be slow. Consider using multiple transactions instead.");const l=new SatoshisPerKilobyte(f),p=new Transaction;for(const o of a){const s=o.pk||c;if(!s)throw new Error("Private key required for token input");p.addInput($(o,(new V).cancelListing(s,"all",!0,o.satoshis,Script.fromBinary(toArray(o.script,"base64"))))),p.addOutput({satoshis:1,lockingScript:(new P2PKH).lock(s.toAddress().toString())});}for(const o of d)p.addOutput({satoshis:o.amount,lockingScript:(new P2PKH).lock(o.to)});let h;const g=o.changeAddress||(null==u?void 0:u.toAddress());if(!g)throw new Error("paymentPk or changeAddress required for payment change");const w=g,m=(new P2PKH).lock(w);p.addOutput({lockingScript:m,change:!0});let y=0n;const b=p.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let I=0;for(const o of s){const s=o.pk||u;if(!s)throw new Error("paymentPk required for payment utxo");const r=$(o,(new P2PKH).unlock(s,"all",!0,o.satoshis,Script.fromBinary(toArray(o.script,"base64"))));if(p.addInput(r),y+=BigInt(o.satoshis),I=await l.computeFee(p),y>=b+BigInt(I))break}if(y<b+BigInt(I))throw new Error(`Not enough funds to cancel ordinal listings. Total sats in: ${y}, Total sats out: ${b}, Fee: ${I}`);await p.fee(l),await p.sign();const B=p.outputs.findIndex(t=>t.change);if(-1!==B){const t=p.outputs[B];h={satoshis:t.satoshis,txid:p.id("hex"),vout:B,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")};}return h&&(h.satoshis=p.outputs[p.outputs.length-1].satoshis,h.txid=p.id("hex")),{tx:p,spentOutpoints:p.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:h}},G=async o=>{const{protocol:s,tokenID:a,paymentPk:c,ordPk:u,additionalPayments:d,listingUtxos:f,utxos:l,satsPerKb:p=k}=o;let h=0;if(f.length>100&&console.warn("Creating many inscriptions at once can be slow. Consider using multiple transactions instead."),!f.every(t=>t.id===a))throw new Error("Input tokens do not match the provided tokenID");const g=new SatoshisPerKilobyte(p),w=new Transaction;for(const t of f){const o=t.pk||u;if(!o)throw new Error("Private key required for token input");w.addInput($(t,(new V).cancelListing(o,"all",!0,t.satoshis,Script.fromBinary(toArray(t.script,"base64"))))),h+=Number.parseInt(t.amt);}const m={p:"bsv-20",op:"transfer",amt:h.toString()};let y;if(s===exports.TokenType.BSV20)y=S({},m,{tick:a});else {if(s!==exports.TokenType.BSV21)throw new Error("Invalid protocol");y=S({},m,{id:a});}const b=o.ordAddress||(null==u?void 0:u.toAddress());if(!b)throw new Error("ordAddress or ordPk required for token output");const B={address:b,inscription:{dataB64:Buffer.from(JSON.stringify(y)).toString("base64"),contentType:"application/bsv-20"}},x=(new I).lock(B.address,B.inscription);w.addOutput({satoshis:1,lockingScript:x});for(const o of d)w.addOutput({satoshis:o.amount,lockingScript:(new P2PKH).lock(o.to)});let E;const O=o.changeAddress||(null==c?void 0:c.toAddress());if(!O)throw new Error("paymentPk or changeAddress required for payment change");const A=(new P2PKH).lock(O);w.addOutput({lockingScript:A,change:!0});let P=0n;const T=w.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let N=0;for(const o of l){const s=o.pk||c;if(!s)throw new Error("paymentPk required for payment utxo");const r=$(o,(new P2PKH).unlock(s,"all",!0,o.satoshis,Script.fromBinary(toArray(o.script,"base64"))));if(w.addInput(r),P+=BigInt(o.satoshis),N=await g.computeFee(w),P>=T+BigInt(N))break}if(P<T+BigInt(N))throw new Error(`Not enough funds to cancel token listings. Total sats in: ${P}, Total sats out: ${T}, Fee: ${N}`);await w.fee(g),await w.sign();const q=[{amt:h.toString(),script:Buffer.from(x.toHex(),"hex").toString("base64"),txid:w.id("hex"),vout:0,id:a,satoshis:1}],C=w.outputs.findIndex(t=>t.change);if(-1!==C){const t=w.outputs[C];E={satoshis:t.satoshis,txid:w.id("hex"),vout:C,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")};}return E&&(E.satoshis=w.outputs[w.outputs.length-1].satoshis,E.txid=w.id("hex")),{tx:w,spentOutpoints:w.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:E,tokenChange:q}},Y=async(t,o)=>{throw new Error("Not implemented")},Q=async s=>{const{utxos:a,paymentPk:c,listing:u,ordAddress:d,additionalPayments:f=[],satsPerKb:l=k,royalties:p=[],metaData:h}=s,g=new SatoshisPerKilobyte(l),w=new Transaction;w.addInput($(u.listingUtxo,(new V).purchaseListing(1,Script.fromBinary(toArray(u.listingUtxo.script,"base64"))))),w.addOutput({satoshis:1,lockingScript:(new I).lock(d,void 0,h)});const m=new Reader(toArray(u.payout,"base64")),y=m.readUInt64LEBn().toNumber(),b=m.readVarIntNum(),B=m.read(b),S=LockingScript.fromBinary(B);w.addOutput({satoshis:y,lockingScript:S});for(const o of f)w.addOutput({satoshis:o.amount,lockingScript:(new P2PKH).lock(o.to)});for(const o of p){let s;const r=Math.floor(Number(o.percentage)*y);switch(o.type){case exports.RoytaltyType.Paymail:s=await Y();break;case exports.RoytaltyType.Script:s=Script.fromBinary(toArray(o.destination,"base64"));break;case exports.RoytaltyType.Address:s=(new P2PKH).lock(o.destination);break;default:throw new Error("Invalid royalty type")}if(!s)throw new Error("Invalid royalty destination");w.addOutput({satoshis:r,lockingScript:s});}let x;const v=s.changeAddress||(null==c?void 0:c.toAddress());if(!v)throw new Error("Either changeAddress or paymentPk is required");const O=(new P2PKH).lock(v);w.addOutput({lockingScript:O,change:!0});let A=0n;const P=w.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let T=0;for(const o of a){const s=o.pk||c;if(!s)throw new Error("Private key is required to sign the payment");const r=$(o,(new P2PKH).unlock(s,"all",!0,o.satoshis,Script.fromBinary(toArray(o.script,"base64"))));if(w.addInput(r),A+=BigInt(o.satoshis),T=await g.computeFee(w),A>=P+BigInt(T))break}if(A<P+BigInt(T))throw new Error(`Not enough funds to purchase ordinal listing. Total sats in: ${A}, Total sats out: ${P}, Fee: ${T}`);await w.fee(g),await w.sign();const N=w.outputs.findIndex(t=>t.change);if(-1!==N){const t=w.outputs[N];x={satoshis:t.satoshis,txid:w.id("hex"),vout:N,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")};}return x&&(x.satoshis=w.outputs[w.outputs.length-1].satoshis,x.txid=w.id("hex")),{tx:w,spentOutpoints:w.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:x}},z=async s=>{const{protocol:a,tokenID:c,utxos:u,paymentPk:d,listingUtxo:f,ordAddress:l,satsPerKb:p=k,additionalPayments:h=[],metaData:g}=s,w=new SatoshisPerKilobyte(p),m=new Transaction;m.addInput($(f,(new V).purchaseListing(1,Script.fromBinary(toArray(f.script,"base64")))));const y={p:"bsv-20",op:"transfer",amt:f.amt};let b;if(a===exports.TokenType.BSV20)b=S({},y,{tick:c});else {if(a!==exports.TokenType.BSV21)throw new Error("Invalid protocol");b=S({},y,{id:c});}const B=Buffer.from(JSON.stringify(b)).toString("base64");if(m.addOutput({satoshis:1,lockingScript:(new I).lock(l,{dataB64:B,contentType:"application/bsv-20"},g)}),!f.payout)throw new Error("Listing UTXO does not have a payout script");const x=new Reader(toArray(f.payout,"base64")),E=x.readUInt64LEBn().toNumber(),O=x.readVarIntNum(),A=x.read(O),P=LockingScript.fromBinary(A);m.addOutput({satoshis:E,lockingScript:P});for(const o of h)m.addOutput({satoshis:o.amount,lockingScript:(new P2PKH).lock(o.to)});let T;const N=s.changeAddress||(null==d?void 0:d.toAddress());if(!N)throw new Error("Either changeAddress or paymentPk is required");const q=(new P2PKH).lock(N);m.addOutput({lockingScript:q,change:!0});let C=0n;const _=m.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let F=0;for(const o of u){const s=o.pk||d;if(!s)throw new Error("Private key is required to sign the payment");const r=$(o,(new P2PKH).unlock(s,"all",!0,o.satoshis,Script.fromBinary(toArray(o.script,"base64"))));if(m.addInput(r),C+=BigInt(o.satoshis),F=await w.computeFee(m),C>=_+BigInt(F))break}if(C<_+BigInt(F))throw new Error(`Not enough funds to purchase token listing. Total sats in: ${C}, Total sats out: ${_}, Fee: ${F}`);await m.fee(w),await m.sign();const D=m.outputs.findIndex(t=>t.change);if(-1!==D){const t=m.outputs[D];T={satoshis:t.satoshis,txid:m.id("hex"),vout:D,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")};}return T&&(T.satoshis=m.outputs[m.outputs.length-1].satoshis,T.txid=m.id("hex")),{tx:m,spentOutpoints:m.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:T}},{toArray:Z}=n$1,tt=new Error("Image must be a square image with dimensions <= 400x400"),ot=new Error("Image must be a square image"),et=new Error("Error processing image"),nt=new Error("Image dimensions are undefined"),st=async o=>{const{symbol:s,icon:a,decimals:c,utxos:u,initialDistribution:d,paymentPk:f,destinationAddress:l,satsPerKb:p=k,additionalPayments:h=[]}=o,g=new SatoshisPerKilobyte(p),m=new Transaction;let y;if("string"==typeof a)y=a;else {const t=await(async t=>{const{dataB64:o,contentType:e}=t;if("image/svg+xml"===e)return (t=>{const o=Buffer.from(t,"base64").toString("utf-8"),e=o.match(/<svg[^>]*\s+width="([^"]+)"/),n=o.match(/<svg[^>]*\s+height="([^"]+)"/);if(!e||!n)return nt;const s=Number.parseInt(e[1],10),r=Number.parseInt(n[1],10);return Number.isNaN(s)||Number.isNaN(r)?nt:s!==r?ot:s>400||r>400?tt:null})(o);if((n=e)!=n)return et;var n;try{const t=Uint8Array.from(Z(o,"base64")),e=imageMeta(t);return void 0===e.width||void 0===e.height?nt:e.width!==e.height?ot:e.width>400||e.height>400?tt:null}catch(t){return et}})(a);if(t)throw t;const o=(new I).lock(l,a);m.addOutput({satoshis:1,lockingScript:o}),y="_0";}if(!(t=>{if(!t.includes("_")||t.endsWith("_"))return !1;const o=Number.parseInt(t.split("_")[1]);return !(Number.isNaN(o)||!t.startsWith("_")&&64!==t.split("_")[0].length)})(y))throw new Error("Invalid icon format. Must be either outpoint (format: txid_vout) or relative output index of the icon (format _vout). examples: ecb483eda58f26da1b1f8f15b782b1186abdf9c6399a1c3e63e0d429d5092a41_0 or _1");const b={p:"bsv-20",op:"deploy+mint",sym:s,icon:y,amt:(c?BigInt(d.tokens)*10n**BigInt(c):BigInt(d.tokens)).toString()};c&&(b.dec=c.toString());const B=Buffer.from(JSON.stringify(b)).toString("base64"),S={satoshis:1,lockingScript:(new I).lock(l,{dataB64:B,contentType:"application/bsv-20"})};m.addOutput(S);for(const o of h){const e={satoshis:o.amount,lockingScript:(new P2PKH).lock(o.to)};m.addOutput(e);}let x=0n;const v=m.outputs.reduce((t,o)=>t+BigInt(o.satoshis||0),0n);let E,O=0;for(const o of u){const s=o.pk||f;if(!s)throw new Error("Private key is required to sign the payment");const r=$(o,(new P2PKH).unlock(s,"all",!0,o.satoshis,Script.fromBinary(toArray(o.script,"base64"))));if(m.addInput(r),x+=BigInt(o.satoshis),O=await g.computeFee(m),x>=v+BigInt(O))break}if(x<v+BigInt(O))throw new Error(`Not enough funds to deploy token. Total sats in: ${x}, Total sats out: ${v}, Fee: ${O}`);const A=o.changeAddress||(null==f?void 0:f.toAddress());if(!A)throw new Error("Either changeAddress or paymentPk is required");const P=(new P2PKH).lock(A);m.addOutput({lockingScript:P,change:!0}),await m.fee(g),await m.sign();const T=m.outputs.findIndex(t=>t.change);if(-1!==T){const t=m.outputs[T];E={satoshis:t.satoshis,txid:m.id("hex"),vout:T,script:Buffer.from(t.lockingScript.toBinary()).toString("base64")};}return {tx:m,spentOutpoints:m.inputs.map(t=>`${t.sourceTXID}_${t.sourceOutputIndex}`),payChange:E}},rt=async t=>{const o=new Transaction,s=[],{ordinals:r,metaData:a,ordPk:c}=t;for(const t of r){if(1!==t.satoshis)throw new Error("1Sat Ordinal utxos must have exactly 1 satoshi");const r=t.pk||c;if(!r)throw new Error("Private key is required to sign the ordinal");const i=$(t,(new I).unlock(r,"all",!0,t.satoshis,Script.fromBinary(toArray(t.script,"base64"))));s.push(`${t.txid}_${t.vout}`),o.addInput(i);}if(a&&(!a.app||!a.type))throw new Error("MAP.app and MAP.type are required fields");let u="";if(null!=a&&a.app&&null!=a&&a.type){u=`OP_FALSE OP_RETURN ${m(y)} ${m("SET")}`;for(const[t,o]of Object.entries(a))"cmd"!==t&&(u=`${u} ${m(t)} ${m(o)}`);}return o.addOutput({satoshis:0,lockingScript:Script.fromASM(u||"OP_FALSE OP_RETURN")}),await o.sign(),{tx:o,spentOutpoints:s}};class it{constructor(t){this.fetch=void 0,this.fetch=t;}async request(t,o){const e={method:o.method,headers:o.headers,body:JSON.stringify(o.data)},n=await this.fetch.call(window,t,e),s=n.headers.get("Content-Type"),r=null!=s&&s.startsWith("application/json")?await n.json():await n.text();return {ok:n.ok,status:n.status,statusText:n.statusText,data:r}}}const at=()=>new ct;class ct{constructor(t=function(){const t={async request(...t){throw new Error("No method available to perform HTTP request")}};if("undefined"!=typeof window&&"function"==typeof window.fetch){const t=window.fetch;return window.fetch=async(...o)=>await t(...o),new it(window.fetch)}if("undefined"==typeof require)return t;try{const t=require("node:https");return new NodejsHttpClient(t)}catch(o){return t}}()){this.URL=void 0,this.httpClient=void 0,this.URL=`${b}/tx`,this.httpClient=t;}async broadcast(t){const o={method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},data:{rawtx:toBase64(t.toBinary())}};try{var e,s;const t=await this.httpClient.request(this.URL,o);return t.ok?{status:"success",txid:t.data,message:"broadcast successful"}:{status:"error",code:null!=(e=t.status.toString())?e:"ERR_UNKNOWN",description:null!=(s=t.data.message)?s:"Unknown error"}}catch(t){return {status:"error",code:"500",description:t instanceof Error?t.message:"Internal Server Error"}}}}

exports.MAX_TOKEN_SUPPLY = A;
exports.OneSatBroadcaster = ct;
exports.OrdLock = V;
exports.OrdP2PKH = I;
exports.applyInscription = B;
exports.burnOrdinals = rt;
exports.cancelOrdListings = W;
exports.cancelOrdTokenListings = G;
exports.createOrdListings = J;
exports.createOrdTokenListings = X;
exports.createOrdinals = L;
exports.deployBsv21Token = st;
exports.fetchNftUtxos = N;
exports.fetchPayUtxos = T;
exports.fetchTokenUtxos = q;
exports.oneSatBroadcaster = at;
exports.purchaseOrdListing = Q;
exports.purchaseOrdTokenListing = z;
exports.selectTokenUtxos = _;
exports.sendOrdinals = R;
exports.sendUtxos = U;
exports.stringifyMetaData = D;
exports.transferOrdTokens = j;
exports.validateSubTypeData = K;
//# sourceMappingURL=bundle.cjs.js.map
