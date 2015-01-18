var _         = require('lodash');
var bignum    = require('bignumber.js');
var config    = require('./config.js');
var pJson     = require('./../package.json');
var validator = require('./schema-validator.js');

module.exports = {
  dropsToXrp: dropsToXrp,
  xrpToDrops: xrpToDrops,
  parseBalanceChanges: parseBalanceChanges,
  getPackageVersion: getPackageVersion,
  getApiVersion: getApiVersion,
  getUrlBase: getUrlBase,
  parseLedger: parseLedger,
  parseCurrencyAmount: parseCurrencyAmount,
  parseCurrencyQuery: parseCurrencyQuery
};

function dropsToXrp(drops) {
  return bignum(drops).dividedBy(1000000.0).toString();
}

function xrpToDrops(xrp) {
  return bignum(xrp).times(1000000.0).floor().toString();
}

function parseBalanceChanges(tx, address) {
  if (typeof tx !== 'object' || typeof address !== 'string') {
    return [];
  }

  if (!(tx.meta && tx.meta.AffectedNodes)) {
    return [];
  }

  var currencyBalanceChanges = {};

  tx.meta.AffectedNodes.forEach(function(affNode) {
    var node = affNode.CreatedNode || affNode.ModifiedNode || affNode.DeletedNode;
    var change;

    switch (node.LedgerEntryType) {
      case 'AccountRoot':
        // Look for XRP balance change in AccountRoot node
        change = parseAccountRootBalanceChange(node, address);
        break;
      case 'RippleState':
        // Look for trustline balance change in RippleState node
        change = parseTrustlineBalanceChange(node, address);
        break;
    }

    if (change) {
      var existingBalanceChange = currencyBalanceChanges[change.currency];

      if (existingBalanceChange) {
        existingBalanceChange.value = bignum(existingBalanceChange.value).minus(bignum(0).minus(bignum(change.value))).toString();
      } else {
        currencyBalanceChanges[change.currency] = change;
      }
    }
  });

  return _.values(currencyBalanceChanges);
};

function parseAccountRootBalanceChange(node, address) {
  if (node.NewFields) {
    if (node.NewFields.Account === address) {
      return {
        value: dropsToXrp(node.NewFields.Balance),
        currency: 'XRP',
        issuer: ''
      };
    }
  } else if (node.FinalFields) {
    if (node.FinalFields.Account === address) {
      var finalBal = dropsToXrp(node.FinalFields.Balance);
      var prevBal;
      var balChange;

      if (node.PreviousFields && (typeof node.PreviousFields.Balance === 'string')) {
        prevBal = dropsToXrp(node.PreviousFields.Balance);
      } else {
        prevBal = 0;
      }

      balChange = bignum(finalBal).minus(prevBal).toString();

      return {
        value: balChange,
        currency: 'XRP',
        issuer: ''
      };
    }
  }

  return null;
}

function parseTrustlineBalanceChange(node, address) {
  var balChange = {
    value: '',
    currency: '',
    issuer: ''
  };

  var trustHigh;
  var trustLow;
  var trustBalFinal;
  var trustBalPrev;

  if (node.NewFields) {
    trustHigh     = node.NewFields.HighLimit;
    trustLow      = node.NewFields.LowLimit;
    trustBalFinal = node.NewFields.Balance;
  } else {
    trustHigh     = node.FinalFields.HighLimit;
    trustLow      = node.FinalFields.LowLimit;
    trustBalFinal = node.FinalFields.Balance;
  }

  if (node.PreviousFields && node.PreviousFields.Balance) {
    trustBalPrev = node.PreviousFields.Balance;
  } else {
    trustBalPrev = { value: '0' };
  }

  // Set value
  if (trustLow.issuer === address) {
    balChange.value = bignum(trustBalFinal.value).minus(trustBalPrev.value).toString();
  } else if (trustHigh.issuer === address) {
    balChange.value = bignum(0).minus(bignum(trustBalFinal.value).minus(trustBalPrev.value)).toString();
  } else {
    return null;
  }

  // Set currency
  balChange.currency = trustBalFinal.currency;

  // Set issuer
  if ((bignum(trustHigh.value).equals(0) && bignum(trustLow.value).equals(0)) ||
    (bignum(trustHigh.value).greaterThan(0) && bignum(trustLow.value).greaterThan(0))) {

    if (bignum(trustBalFinal.value).greaterThan(0) || bignum(trustBalPrev.value).greaterThan(0)) {
      balChange.issuer = trustLow.issuer;
    } else {
      balChange.issuer = trustHigh.issuer;
    }

  } else if (bignum(trustHigh.value).greaterThan(0)) {
    balChange.issuer = trustLow.issuer;
  } else if (bignum(trustLow.value).greaterThan(0)) {
    balChange.issuer = trustHigh.issuer;
  }

  return balChange;
}

function getPackageVersion() {
  return pJson.version;
}

function getApiVersion() {
  var pattern = /([0-9])(?:\.)/g;
  return pattern.exec(getPackageVersion())[1];
}

function getUrlBase(request) {
  if (config.get('url_base')) {
    return config.get('url_base');
  }
  return request.protocol + '://' + request.hostname + (config && config.get('port') ? ':' + config.get('port') : '');
}

function isValidHash256(hash) {
  return validator.isValid(hash,'Hash256');
}

function parseLedger(ledger) {
  if (/^current$|^closed$|^validated$/.test(ledger)) {
    return ledger;
  }

  if (ledger && Number(ledger) >= 0 && isFinite(Number(ledger))) {
    return ledger;
  }

  if (isValidHash256(ledger)) {
    return ledger;
  }

  return 'validated';
}

function parseCurrencyAmount(currencyAmount) {
  if (typeof currencyAmount === 'string') {
    return {
      currency: 'XRP',
      counterparty: '',
      value: dropsToXrp(currencyAmount)
    };
  } else {
    return {
      currency: currencyAmount.currency,
      counterparty: currencyAmount.issuer,
      value: currencyAmount.value
    };
  }
}

function parseCurrencyQuery(query) {
  var params = query.split('+');

  if (!isNaN(params[0])) {
    return {
      value:    (params.length >= 1 ? params[0] : ''),
      currency: (params.length >= 2 ? params[1] : ''),
      issuer:   (params.length >= 3 ? params[2] : '')
    };
  } else {
    return {
      currency: (params.length >= 1 ? params[0] : ''),
      issuer:   (params.length >= 2 ? params[1] : '')
    };
  }
}
