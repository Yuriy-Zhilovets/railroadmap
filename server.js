#!/usr/bin/nodejs

// Сервер для Railroadmap
// Ю. Жиловец, 4 мая 2013 г.

var mongo = require('mongodb');
var ObjectID = mongo.ObjectID;

var express = require('express');
var app = express();

var async = require("async");

//app.use(express.logger());
app.use(express.favicon());
app.use(express.bodyParser());
app.use(express.query());

app.use(function(req,res,next)
{
  res.charset = "utf-8";
  next();
});

/*
// Разберем куки
app.use(function(req,res,next)
{
  req.cookies = {};
  if (req.headers.cookie)
  {
    req.headers.cookie.split(/;\s/).forEach(function(el)
    {
      var c = el.split("=");
      req.cookies[c[0]] = unescape(c[1]);
    });
  }
  next();
});
*/

// преобразовать credentails в пользователя
/*
app.use(function(req, res, next)
{
  if (new RegExp("^(/res/)|(/extjs/)|(/login.html)|(/login.js)|(/sha256.js)").test(req.url))
  {
    req.user = true;
    return next();
  }
  
  if (req.url=="/")
  {
    req.user = true;
  }
  
  if (!req.cookies.credentials)
  {
    return next();
  }
  
  var cred = req.cookies.credentials.split("/");
  db.collection("users").findOne({name: cred[0], passhash: cred[1]}, function(err,doc)
  {
      if (err)
      {
        entity.reportError(res,error);
      }
      req.user = doc || req.user; 
      next();
  });
});
*/

/*
// разбираемся с выдачей файлов
app.use(function(req,res,next)
{
  if (!req.user)
  {
    res.send(403,{success: false, message: "Отказано в доступе"});
  }
  else
  {
    next();
  }
});
*/

app.use("/",express.static(__dirname + "/www"));
app.use(app.router);

app.use(function(err,req,res,next)
{
  // Последний обработчик ошибок
  res.send(500,{message: err.message, trace: err.stack});
  next(err);
});
                                            
var db;

app.configure(function()
{
  app.set("port", 2000);
  app.set("index","/index.html");
  
  db = new mongo.Db('railroad', new mongo.Server("localhost", 27017, {auto_reconnect: true}), {fsync: true});
  db.open(function(err,db)
  {
    if (err)
    {
      console.log("Cannot open database 'railroad'");
      process.exit();
    }

/*    
    db.authenticate('planchet', 'xxxx', function(err, result) 
    {
      if (err)
      {
        console.log("Cannot authentificate to database: "+err);
        process.exit();
      }
    });
*/
    
    app.set('db', db);
  });
});

///////////////////////////////////

app.get("/", function(req,res)
{
//  if (req.user && req.user.name)
  {
    res.redirect(307, app.get("index"));
  }
//  else
//  {
//    res.redirect(307, "/login.html");
//  }
});

/*
app.get("/user-info", function(req,res)
{
  var info = req.user;
  delete info.passhash;
  res.send(200,info);
});
*/

/////////////////////////////////////////

geoGet("point");
geoDelete("point");
geoPost("point","Point");
geoPut("point", "Point");

/////////////////////////////////////////
// LineString

geoGet("rail");
geoGet("rail");
geoPost("rail","LineString");
geoPut("rail", "LineString");

///////////////////////////////////

geoGet("station");
geoGet("station");
geoPost("station","Polygon");
geoPut("station", "Polygon");

///////////////////////////////////

function parseCoord(from)
{
  if (!from)
  {
    return {error: "No coordinates specified"};
  }
      
  var l = from.split(",");
      
  if (l.length%2==1)
  {
    return {error: "Odd number of coordinate points"};
  }
      
  var coord = [];
  for(var i=0; i<l.length; i+=2)
  {
    coord.push([ parseFloat(l[i]),parseFloat(l[i+1]) ]);
  }
      
  return {coord: coord};
}

function geoGet(cls)
{
  uniGet("/"+cls+"/:id", "geo",
  {
    query: function(req)
    {
      return {_id:  new ObjectID(req.params.id), class: cls};
    }
  });
}

function geoDelete(cls)
{
  uniDel("/"+cls+"/:id","geo",
  {
    query: function(req)
    {
      return {_id:  new ObjectID(req.params.id), class: cls};
    }
  });
}

function geoPost(cls,geoType)
{
  uniPost("/"+cls,"geo",
  {
    compose: function(req)
    {
      var row = req.body;

      var result = parseCoordFun[geoType](row.coord);
      
      if (result.error)
      {
        return [result.error];
      }
      
      row.class = cls;
      row.geo = {type: geoType, coordinates: result.coord};
      delete row._id;
      delete row.coord;
      
      return [null,row];
    }
  });
}

function geoPut(cls,geoType)
{
  uniPut("/"+cls+"/:id","geo",
  {
    query: function(req)
    {
      return {_id:  new ObjectID(req.params.id), class: cls};
    },

    compose: function(req)
    {
      var row = req.body;
      var result = parseCoordFun[geoType](row.coord);
      
      if (result.error)
      {
        return [result.error];
      }
      
      if (result.coord)
      {
        row["geo.coordinates"] = result.coord;
      }
      
      delete row._id;
      delete row.type;
      delete row.coord;

      return [null, {$set: row}];
    }
  });
}

var parseCoordFun = {
  Point: parsePoint,
  LineString: parseLineString,
  Polygon: parsePolygon,
};

function parseLineString(from)
{
  var result = parseCoord(from);
  
  if (result.error)
  {
    return {error: result.error};
  }
  
  return {coord: result.coord };
}

function parsePoint(from)
{
  var result = parseCoord(from);
  
  if (result.error)
  {
    return {error: result.error};
  }
  
  return {coord: result.coord[0] };
}

function parsePolygon(from)
{
  var result = parseCoord(from);
  
  if (result.error)
  {
    return {error: result.error};
  }
  
  result.coord.push(result.coord[0]);
  
  return {coord: [ result.coord ]};
}

/////////////////////////////////////////

app.get("/map",function(req,res)
{
  var col = db.collection("geo");
  var r = parseCoord(req.query.coord);
  if (r.error)
  {
    res.send(400,{error: res.error});
  }
  
  var x1 = r.coord[0][0];
  var y1 = r.coord[0][1];
  var x2 = r.coord[1][0];
  var y2 = r.coord[1][1];
  
  col.find({geo:
              { $geoIntersects :
                { $geometry :
                { type : "Polygon" ,
                        coordinates: [ [ [x1,y1] , [x1,y2] , [x2,y2] , [x2,y1], [x1,y1] ] ]
                }}}},
  function(err,cursor)
  {
    if (err)
    {
      return reportError(res,e);
    }
    
    cursor.toArray(function(err,items)
    {
      if (err)
      {
        return reportError(res,err);
      }
      
      res.send(items);
    });
  });
});

/////////////////////////////////////////////

uniPost("/user", "users", 
{
  compose: function(req)
  {
    var row = req.body;
    delete row._id;
    delete row.perm;
  
    if (!row.login || !row.passhash)
    {
      return ["No login or password hash"];
    }
  
    row.perm = {}; // права по умолчанию
    
    return [null,row];
  },
  
  modify: function(item)
  {
    delete item.passhash;
    delete item.perm;
  },
});

uniGet("/user/:id", "users", 
{
  modify: function(item) 
  {
    delete item.passhash;
    delete item.perm;
  }
});

uniDel("/user/:id", "users");

uniPut("/user/:id", "users", 
{
  compose: function(req,res)
  {
    var row = req.body;
    delete row._id;
    delete row.perm;
    return [null, {$set: row}];
  },
});

/////////////////////////////////////////////

app.post("/user/:id/perm", function(req,res)
{
  res.send(405);
});

app.delete("/user/:id/perm", function(req,res)
{
  res.send(405);
});

uniGet("/user/:id/perm", "users", 
{
  modify: function(item)
  {
    item = {perm: Object.keys(item.perm).join(",")};
  }
});

uniPut("/user/:id/perm", "users", 
{
  compose: function(req)
  {  
    var perm = {};
  
    if (!req.body.perm)
    {
      return ["Variable 'perm' is missing"];
    }
  
    req.body.perm.split(",").forEach(function(el)
    {
      perm[el] = 1;
    });
    
    return [null, {$set: {perm: perm}}];
  }
});

/////////////////////////// /owner

uniGet("/owner/:id","owners");
uniDel("/owner/:id","owners");

app.post("/owner", function(req,res)
{
  var col = db.collection("owners");
  
  var row = req.body;
  delete row._id;

  var q = row.parent ? { _id: new ObjectID(row.parent) } : { _id: {$exists: false} };
  
  async.waterfall(
  [
    function(callback)
    {
      col.findOne(q, callback);
    },
    function(item, callback)
    {
      if (row.parent && !item)
      {
        return callback(reqError(400,"Parent does not exist"));
      }
      
      col.insert(row, {safe: true}, callback);
    },
  ], 
  finalPost);
});

app.put("/owner/:id", function(req,res)
{
    var col = db.collection("owners");
    
    var row = req.body;
    delete row._id;
    
    var q = row.parent ? { _id: new ObjectID(row.parent) } : { _id: {$exists: false} };
    
    async.waterfall(
    [
      function(callback)
      {
        col.findOne(q, callback);
      },
      function(item, callback)
      {
        if (row.parent && !item)
        {
          return callback(reqError(400,"Parent does not exist"));
        }
      
        col.update(queryByID(req), row, callback);
      },
    ], 
    finalPut);
});

/////////////////////////////////////////////////////////

function queryByID(req)
{
  return {_id: new ObjectID(req.params.id)};
}

function composeAll(req)
{
  var row = req.body;
  delete row._id;
  return [null,row];
}

function uniGet(url,collection,arg)
{
  arg = arg || {};
  app.get(url, function(req,res)
  {
    var col = db.collection(collection);
    var q = (arg.query||queryByID)(req);
  
    col.findOne(q,function(err,item)
    {
      if (err)
      {
        return reportError(res, err);
      }
      if (item)
      {
        if (arg.modify)
        {
          arg.modify(item);
        }
        res.send(200,item);
      }
      else
      {
        reportNotFound(res);
      }
    });
  });
};

function uniDel(url,collection,arg)
{
  arg = arg || {};
  app.delete(url, function(req,res)
  {
    var col = db.collection("users");
    var q = (arg.query||queryByID)(req);
  
    col.remove(q, {single: 1}, function(err,cnt)
    {
      if (err)
      {
        return reportError(res, err);
      }
      if (cnt)
      {
        res.send(200);
      }
      else
      {
        reportNotFound(res);
      }
    });
  });
}

function uniPut(url,collection,arg)
{
  arg = arg || {};
  app.put(url, function(req,res)
  {
    var col = db.collection(collection);
    var q = (arg.query||queryByID)(req);
    
    var data = (arg.compose||composeAll)(req);
    if (data[0])
    {
      return sendError(res, 400, data[0]);
    }
  
    col.update(q, data[1], finalPut);
  });
}

function uniPost(url, collection, arg)
{
  app.post(url, function(req,res)
  {
    var col = db.collection(collection);
    
    var data = (arg.compose||composeAll)(req);
    if (data[0])
    {
      return sendError(res, 400, data[0]);
    }
  
    col.insert(data[1], {safe: true}, function(err,items)
    {
      finalPost(err,items,arg);
    });
  });
}

function finalPut(err, cnt) 
{
  if (err)
  {
    sendError(res, err.status||500, err.message);
  }
  else
  {
    if (cnt)
    {
      res.send(200);
    }
    else
    {
      reportNotFound(res);
    }
  }
}

function finalPost(err, items, args)
{
  var args = args || {};
  
  if (err)
  {
    sendError(res, err.status||500, err.message);
  }

  if (args.modify)
  {
    args.modify(items[0]);
  }
    
  res.send(201,items[0]);
}

/////////////////////////////////////////////

function sendError(res,code,msg)
{
  res.send(code, {message: msg});
}

function reportError(res,err)
{
  sendError(res, 500, err.message);
}

function reportNotFound(res)
{
  sendError(res, 404, "Object is not found");
}

function reqError(code,message)
{
  var e = new Error(message);
  e.status = code;
  return e;
}

////////////////////////////

app.listen(app.get("port"));
console.log('Listening on port ' + app.get("port") + ' (env: ' + process.env.NODE_ENV+')');
