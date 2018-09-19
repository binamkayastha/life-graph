require("./rawData.js")
require("chartist")
// require("chartist-plugin-tooltips") // Can't use npm package cause bug
// https://github.com/tmmdata/chartist-plugin-tooltip/issues/148


document.addEventListener("DOMContentLoaded", function(event) {
  displayGraphFromRawData(rawAugust);
});

const Transaction =  {
  rawData: {},
  // Assumes data has the parameters, and that the values are expected
  createTransactionObj: function(rawData) {
    // To avoid scoping issues in forEach loop, name this to self
    let self = this;
    self.rawData = rawData
    let transactionObj = {}
    const paramList = self.getParamList()
    paramList.forEach(function(param) {
      transactionObj[param] = self.parseValue(param)
    });
    return transactionObj
  },
  parseValue: function(param) {
    const rawString = this.rawData[param]
    const regex = this.paramToRegexMap[param]
    matchedString = regex.exec(rawString)[1]
    return this.paramToParseFunction[param](matchedString)
  },
  paramToRegexMap: {
    "postingDate": /(\d\d\/\d\d\/\d\d\d\d)/, // Matches date
    "description": /\d\d\d\d\s(.*)/, // Matches everything after date
    "type": /Type (\S*)/, // Matches any nonwhitespace after "Type "
    "amount": /\$(\S*)/, // Matches any nonwhitespaces after $
    "balance": /\$(\S*)/, // Matches any nonwhitespaces after $
  },
  paramToParseFunction: {
    "postingDate": Date.parse,
    "description": x => x,
    "type": x => x,
    "amount": parseFloat,
    "balance": parseFloat
  },
  getParamList: function() {
    return ["postingDate", "description", "type", "amount", "balance"]
  }
}

function displayGraphFromRawData(rawData) {
  transactionList = createTransactionListFromRawData(rawData)
  chartData = makeChartData(transactionList)
  createChart(chartData)
}

function createTransactionListFromRawData(rawData) {
  const rawTransactionList = getRawDataList(rawData)
  const transactionParams = Transaction.getParamList()
  dataFits = isListMultipleOfParams(rawTransactionList, transactionParams)
  if(!dataFits) {
    alert("Data does not fit")
    return false // Better to throw exception here
  }
  transactionList = getListOfTransactionObjects(rawTransactionList, transactionParams);
  return transactionList
}

function getRawDataList(rawMonthData) {
  const transactionList = rawMonthData.split(/\n|\t/);
  return transactionList;
}

function isListMultipleOfParams(rawTransactionList, transactionParams) {
  return (rawTransactionList.length % transactionParams.length) == 0
}

function getListOfTransactionObjects(rawDataList, params) {
  const numOfRawDataValues = rawDataList.length
  const numOfParams = params.length
  let listOfObjects = []
  for(i=0; i < numOfRawDataValues; i += numOfParams){
    var rawObj = {}
    for(paramIndex=0; paramIndex < numOfParams; paramIndex++) {
      var currentParam = params[paramIndex]
      var currentValue = rawDataList[i+paramIndex]
      rawObj[currentParam] = currentValue
    }
    const newObj = Transaction.createTransactionObj(rawObj)
    listOfObjects.push(newObj)
  }
  return listOfObjects
}

function makeChartData(transactionList) {
  let graphData = []
  let graphDictionary = {}
  let cummulativeSpend = 0;
  // BofA data table is recent -> old, we want old -> recent
  transactionList.reverse()
  transactionList.forEach(function(transaction) {
    if(transaction.type != "Purchases")
      return;
    currentDate = transaction.postingDate
    cummulativeSpend += transaction.amount
    if(graphDictionary[currentDate] != undefined) {
      graphDictionary[currentDate] += transaction.amount
    }
    else {
      graphDictionary[currentDate] = cummulativeSpend
    }
  });
  for (let key in graphDictionary) {
    if (graphDictionary.hasOwnProperty(key)) {
      graphData.push({
        meta: "Description",
        x: key,
        y: graphDictionary[key]
      }) }
  }
  return graphData
}

function createChart(chartData) {
  var chart = new Chartist.Line('.ct-chart', {
    series: [
      {
        name: 'series-1',
        data: chartData
      },
    ]
  }, {
      axisX: {
        type: Chartist.FixedScaleAxis,
        divisor: 5,
        labelInterpolationFnc: function (value) {
          return moment(value).format('MMM D');
        }
      },
      fullWidth: true,
      plugins: [
        Chartist.plugins.tooltip()
      ],
    });
}


/* Todo:
 * Split up makeChartData, to multiple funcs.
  * think of representing data so you can do mouse over
 * add accesibility detailed tables
 * add tooltip plugin
 * Add a projection of where the money is headed for the next week
 - Measure how much money is spent weekly, and create a projection
 - Measure which transactions make you happy, neutral, and sad
 */
