let colorHelper = {
    getClosestColor: function (targetColor, colorPalette) {
        let minDistance = Number.MAX_VALUE;
        let closestColor = null;

        for (let color of colorPalette) {
            let distance = new dE00(rgb2lab(targetColor), rgb2lab(color)).getDeltaE();
            if (distance >= minDistance) continue;

            minDistance = distance;
            closestColor = color;
        }

        return closestColor;
    }
};

function dE00(x1, x2, weights) {
    var sqrt = Math.sqrt;
    var pow = Math.pow;
    
    this.x1 = x1;
    this.x2 = x2;
    
    this.weights = weights || {};
    this.ksubL = this.weights.lightness || 1;
    this.ksubC = this.weights.chroma || 1;
    this.ksubH = this.weights.hue || 1;
    
    // Delta L Prime
    this.deltaLPrime = x2.L - x1.L;
    
    // L Bar
    this.LBar = (x1.L + x2.L) / 2;
    
    // C1 & C2
    this.C1 = sqrt(pow(x1.A, 2) + pow(x1.B, 2));
    this.C2 = sqrt(pow(x2.A, 2) + pow(x2.B, 2));
    
    // C Bar
    this.CBar = (this.C1 + this.C2) / 2;
    
    // A Prime 1
    this.aPrime1 = x1.A +
        (x1.A / 2) *
        (1 - sqrt(
            pow(this.CBar, 7) /
            (pow(this.CBar, 7) + pow(25, 7))
        ));

    // A Prime 2
    this.aPrime2 = x2.A +
        (x2.A / 2) *
        (1 - sqrt(
            pow(this.CBar, 7) /
            (pow(this.CBar, 7) + pow(25, 7))
        ));

    // C Prime 1
    this.CPrime1 = sqrt(
        pow(this.aPrime1, 2) +
        pow(x1.B, 2)
    );
    
    // C Prime 2
    this.CPrime2 = sqrt(
        pow(this.aPrime2, 2) +
        pow(x2.B, 2)
    );
    
    // C Bar Prime
    this.CBarPrime = (this.CPrime1 + this.CPrime2) / 2;
    
    // Delta C Prime
    this.deltaCPrime = this.CPrime2 - this.CPrime1;
    
    // S sub L
    this.SsubL = 1 + (
        (0.015 * pow(this.LBar - 50, 2)) /
        sqrt(20 + pow(this.LBar - 50, 2))
    );
    
    // S sub C
    this.SsubC = 1 + 0.045 * this.CBarPrime;
    
    /**
     * Properties set in getDeltaE method, for access to convenience functions
     */
    // h Prime 1
    this.hPrime1 = 0;
    
    // h Prime 2
    this.hPrime2 = 0;
    
    // Delta h Prime
    this.deltahPrime = 0;
    
    // Delta H Prime
    this.deltaHPrime = 0;
    
    // H Bar Prime
    this.HBarPrime = 0;
    
    // T
    this.T = 0;
    
    // S sub H
    this.SsubH = 0;
    
    // R sub T
    this.RsubT = 0;
}

/**
 * Returns the deltaE value.
 * @method
 * @returns {number}
 */
dE00.prototype.getDeltaE = function() {
    var sqrt = Math.sqrt;
    var sin = Math.sin;
    var pow = Math.pow;
    
    // h Prime 1
    this.hPrime1 = this.gethPrime1();
    
    // h Prime 2
    this.hPrime2 = this.gethPrime2();
    
    // Delta h Prime
    this.deltahPrime = this.getDeltahPrime();
    
    // Delta H Prime
    this.deltaHPrime = 2 * sqrt(this.CPrime1 * this.CPrime2) * sin(this.degreesToRadians(this.deltahPrime) / 2);
    
    // H Bar Prime
    this.HBarPrime = this.getHBarPrime();
    
    // T
    this.T = this.getT();
    
    // S sub H
    this.SsubH = 1 + 0.015 * this.CBarPrime * this.T;
    
    // R sub T
    this.RsubT = this.getRsubT();
    
    // Put it all together!
    var lightness = this.deltaLPrime / (this.ksubL * this.SsubL);
    var chroma = this.deltaCPrime / (this.ksubC * this.SsubC);
    var hue = this.deltaHPrime / (this.ksubH * this.SsubH);
   
    return sqrt(
        pow(lightness, 2) +
        pow(chroma, 2) +
        pow(hue, 2) +
        this.RsubT * chroma * hue
    );
};

/**
 * Returns the RT variable calculation.
 * @method
 * @returns {number}
 */
dE00.prototype.getRsubT = function() {
    var sin = Math.sin;
    var sqrt = Math.sqrt;
    var pow = Math.pow;
    var exp = Math.exp;
    
    return -2 *
        sqrt(
            pow(this.CBarPrime, 7) /
            (pow(this.CBarPrime, 7) + pow(25, 7))
        ) *
        sin(this.degreesToRadians(
            60 *
            exp(
                -(
                    pow(
                        (this.HBarPrime - 275) / 25, 2
                    )
                )
            )
        ));
};

/**
 * Returns the T variable calculation.
 * @method
 * @returns {number}
 */
dE00.prototype.getT = function() {
    var cos = Math.cos;
    
    return 1 -
        0.17 * cos(this.degreesToRadians(this.HBarPrime - 30)) +
        0.24 * cos(this.degreesToRadians(2 * this.HBarPrime)) +
        0.32 * cos(this.degreesToRadians(3 * this.HBarPrime + 6)) -
        0.20 * cos(this.degreesToRadians(4 * this.HBarPrime - 63));
};

/**
 * Returns the H Bar Prime variable calculation.
 * @method
 * @returns {number}
 */
dE00.prototype.getHBarPrime= function() {
    var abs = Math.abs;
    
    if (abs(this.hPrime1 - this.hPrime2) > 180) {
        return (this.hPrime1 + this.hPrime2 + 360) / 2
    }
    
    return (this.hPrime1 + this.hPrime2) / 2
};

/**
 * Returns the Delta h Prime variable calculation.
 * @method
 * @returns {number}
 */
dE00.prototype.getDeltahPrime = function() {
    var abs = Math.abs;
    
    // When either C′1 or C′2 is zero, then Δh′ is irrelevant and may be set to
    // zero.
    if (0 === this.C1 || 0 === this.C2) {
        return 0;
    }
    
    if (abs(this.hPrime1 - this.hPrime2) <= 180) {
        return this.hPrime2 - this.hPrime1;
    }
    
    if (this.hPrime2 <= this.hPrime1) {
        return this.hPrime2 - this.hPrime1 + 360;
    } else {
        return this.hPrime2 - this.hPrime1 - 360;
    }
};

/**
 * Returns the h Prime 1 variable calculation.
 * @method
 * @returns {number}
 */
dE00.prototype.gethPrime1 = function() {
    return this._gethPrimeFn(this.x1.B, this.aPrime1);
};

/**
 * Returns the h Prime 2 variable calculation.
 * @method
 * @returns {number}
 */
dE00.prototype.gethPrime2 = function() {
    return this._gethPrimeFn(this.x2.B, this.aPrime2);
};

/**
 * A helper function to calculate the h Prime 1 and h Prime 2 values.
 * @method
 * @private
 * @returns {number}
 */
dE00.prototype._gethPrimeFn = function(x, y) {
    var hueAngle;
    
    if (x === 0 && y === 0) {
        return 0;
    }
    
    hueAngle = this.radiansToDegrees(Math.atan2(x, y));
    
    if (hueAngle >= 0) {
        return hueAngle;
    } else {
        return hueAngle + 360;
    }
};

/**
 * Gives the radian equivalent of a specified degree angle.
 * @method
 * @returns {number}
 */
dE00.prototype.radiansToDegrees = function(radians) {
    return radians * (180 / Math.PI);
};

/**
 * Gives the degree equivalent of a specified radian.
 * @method
 * @returns {number}
 */
dE00.prototype.degreesToRadians = function(degrees) {
    return degrees * (Math.PI / 180);
};


function rgb2lab(rgb){
  var r = rgb.r / 255,
      g = rgb.g / 255,
      b = rgb.b / 255,
      x, y, z;

  r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  return {L:(116 * y) - 16, A:500 * (x - y),B: 200 * (y - z)}
}

/*  test  */
/*
var deltaE = new dE00(
    {L:50, A:50, B:50},
    {L:100, A:50, B:50},
);
console.log(deltaE.getDeltaE());

colors=[{r: 255, g: 255, b: 255},
{r: 193, g: 193, b: 193},
{r: 239, g: 19, b: 11},
{r: 255, g: 113, b: 0},
{r: 255, g: 228, b: 0},
{r: 0, g: 204, b: 0},
{r: 0, g: 178, b: 255},
{r: 35, g: 31, b: 211},
{r: 163, g: 0, b: 186},
{r: 211, g: 124, b: 170},
{r: 160, g: 82, b: 45},
{r: 0, g: 0, b: 0},
{r: 76, g: 76, b: 76},
{r: 116, g: 11, b: 7},
{r: 194, g: 56, b: 0},
{r: 232, g: 162, b: 0},
{r: 0, g: 85, b: 16},
{r: 0, g: 86, b: 158},
{r: 14, g: 8, b: 101},
{r: 85, g: 0, b: 105},
{r: 167, g: 85, b: 116},
{r: 99, g: 48, b: 13}]
colorHelper.getClosestColor({r:50,g:200,b:50},colors)
*/




