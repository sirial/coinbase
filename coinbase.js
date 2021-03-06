var req = require('request');
var repl = require('repl');
var _ = require('underscore');
var csv = require('csv');
var generate = require('csv-generate');
var fs = require('fs');
var csv = require("fast-csv");


var CSVFILE_DEFAULT = "coinbase.csv";
var orders = {};
var market = {
  rates: {}
};

//Run start so that this implementation starts over every time
repl.start({
    prompt: 'coinbase> '
  , eval: function(cmd, context, filename, callback) {

  	  //inputs is put into format ['buy','10','usd']
      var inputs = cmd.toLowerCase().replace('\n', '').split(' ');
      //ake the number that you want to buy a Float
      var number_buying = parseFloat(inputs[1]);
      // Set order ID equal to 'Tue Oct 18 2016 11:12:36 GMT-0700 (PDT)''
      var orderID = new Date().toString();
      // Set currency default to BTC
      var currency = 'BTC';
      
      	//Check if command is buy or sell or order
        switch (inputs[0]) {

          case 'buy':

            //Request data from website which is json format the body parameter of the callback function is of type string
            //so we must convert this to json in order to have easy access in the future
            //We do this in the case statement so the forex is updated in real time.
            req('https://coinbase.com/api/v1/currencies/exchange_rates',function (error, response, body) {
                if (!error) {
                    market.rates = JSON.parse(body);
                }
            });
            //If the entered currency is not undefined make the currency capitalized
      		if (typeof(inputs[2]) != 'undefined') {
        		currency = inputs[2].toUpperCase();
      		}
          	//Check that the user did enter an amount
            if (!number_buying) {
        		callback('No amount specified.');
        		break;
      		}
          	//If the given currency is not BTC then look up the exchange rate and convert to btc
            if (currency != 'BTC') {
              //Look up the rate from the JSON object created above
              var rate = market.rates[ 'btc_to_' + currency.toLowerCase() ];
///////////////Check that the rate is defined in the json file  
              if (typeof(rate) != 'undefined') {
              	//Log order into order dictionary
                orders[ orderID ] = {
                    orderID : orderID
                  ,  type: 'buy'
                  , number_buying: number_buying
                  , rate: rate
                  , currency: currency
                };
                //Calculate number of bitcoins you are buying
                var amount_in_btc = number_buying / rate;
                callback('Order to BUY ' + number_buying.toString() + ' ' + currency + ' worth of BTC queued @ ' + rate + ' BTC/' + currency + ' (' + amount_in_btc + ' BTC) ' );     
              } else {
                console.log('No known exchange rate for BTC/' + currency + '. Order failed.');
              }
            } else { //If a currency is not specified by the user then use the default BTC
              orders[ orderID ] = {
                  orderID : orderID
                ,  type: 'buy'
                , number_buying: number_buying
                , rate: rate
                , currency: currency
              };
              callback('Order to BUY ' + number_buying.toString() + ' BTC queued.');
            }
          break;

          case 'sell':

            //Request data from website which is json format the body parameter of the callback function is of type string
            //so we must convert this to json in order to have easy access in the future
            req('https://coinbase.com/api/v1/currencies/exchange_rates',function (error, response, body) {
                if (!error) {
                    market.rates = JSON.parse(body);
                }
            });
	            //If the entered currency is not undefined make the currency capitalized
	      		if (typeof(inputs[2]) != 'undefined') {
	        		currency = inputs[2].toUpperCase();
	     			 }
	          	//Check that the user did enter an amount
	          	if (!number_buying) {
	        		callback('No amount specified.');
	        		break;
	      			}
          		//If the given currency is not BTC then look up the exchange rate and convert to btc
            	if (currency != 'BTC') {
              		//Look up the rate from the JSON object created above
              		var rate = market.rates[ 'btc_to_' + currency.toLowerCase() ];
///////////////Check that the rate is defined in the json file  
              		if (typeof(rate) != 'undefined') {
              			//Log order into order dictionary
                		orders[ orderID ] = {
                        orderID : orderID
		                  ,  type: 'sell'
		                  , number_buying: number_buying
                      , rate: rate
		                  , currency: currency
		                };
                	var amount_in_btc = number_buying / rate;
                	callback('Order to SELL ' + number_buying.toString() + ' ' + currency + ' worth of BTC queued @ ' + rate + ' BTC/' + currency + ' (' + amount_in_btc + ' BTC) ' );              
              		} else {
                		console.log('No known exchange rate for BTC/' + currency + '. Order failed.');
              			}
            	} else {
		              orders[ orderID ] = {
                      orderID : orderID
		                ,  type: 'sell'
		                , number_buying: number_buying
                    , rate: rate
		                , currency: currency
		              };
              			callback('Order to SELL ' + number_buying.toString() + ' BTC queued.');
            		}
          break;
          //Display all outstanding orders
          case 'orders':
			         console.log('=== CURRENT ORDERS ===');
               //var headers = ["orderID","type","number_buying","currency"];
               //var stringifier = csv.stringify({ header: true, columns: headers}); //The header row is displayed once at the beginning
               _.each(orders,function(order,orderID){ 
                    var result = orderID + ' : ' + order.type.toUpperCase() + ' ' + order.number_buying + ' : UNFILLED';
                    console.log(result);
                    // OLD CSV GENERATION METHOD MIGHT NOT WORK IN EVERY USE CASE BECAUSE CSV STREAM IS BEING GENERATED EACH TIME
                    // //Use generator to make csv file and pass in all data
                    // var generator = generate({columns: ['int', 'bool'], length: 2});
                    // generator.pipe(csv.transform(function(){
                    //     return Object.keys(orders[orderID]).map(function(key,value){
                    //       return orders[orderID][key] //This is where the values are stored in each row
                    //     })
                    // }))
                    // .pipe(stringifier)
                    // .pipe(fs.createWriteStream('out.csv',{flags: 'w' }));                
                });
               //NEW CSV GENERATION METHOD
               //Transform the orders object to include headers for csv generation                                                                                                                  
                var transformedOrders  = Object.keys(orders).map(function(key){
                  return {
                    "timestamp": key,
                    "buy/sell type":orders[key].type,
                    "amount":orders[key].number_buying,
                    "currency":orders[key].currency,
                    "conversion rate to BTC":orders[key].rate
                  };
                });
                //create a writable stream                                                                                                                                                           
                var  writableStream = fs.createWriteStream("my.csv");
                //use fast-csv write function to write the orders and  pipe it to writable stream that can be used to create a csv of unknown size                                                   
                csv.write(transformedOrders, {headers :true}).pipe(writableStream);
               callback();
		      break;

          default:
            console.log('unknown command: "' + cmd + '"');
          break;
        }

    }
});