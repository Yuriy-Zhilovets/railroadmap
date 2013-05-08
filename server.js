#!/usr/bin/nodejs

// Сервер для Railroadmap
// Ю. Жиловец, 4 мая 2013 г.

var mongo = require('mongodb');
var ObjectID = mongo.ObjectID;

var express = require('express');
var app = express();

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
  res.send(500,{success: false, message: err.message, trace: err.stack});
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
  app.get("/"+cls+"/:id",function(req,res)
  {
    try 
    {
      var col = db.collection("geo");
      var id = new ObjectID(req.params.id);
      col.findOne({_id: id, class: cls},function(err,item)
      {
        if (err)
        {
          return reportError(res, err);
        }
        if (item)
        {
          res.send(200,item);
        }
        else
        {
          reportNotFound(res);
        }
      });
    }
    catch (e)
    {
      reportError(res,e);
    }
  });
}

function geoDelete(cls)
{
  app.delete("/"+cls+"/:id",function(req,res)
  {
    try 
    {
      var col = db.collection("geo");
      var id = new ObjectID(req.params.id);
      col.remove({_id: id, class: cls},{single: 1}, function(err,cnt)
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
    }
    catch (e)
    {
      reportError(res,e);
    }
  });
}

function geoPost(cls,geoType)
{
  app.post("/"+cls,function(req,res)
  {
    try 
    {
      var col = db.collection("geo");
      var row = req.body;

      var result = parseCoordFun[geoType](row.coord);
      
      if (result.error)
      {
        return res.send(400,{error: result.error});
      }
      
      row.class = cls;
      row.geo = {type: geoType, coordinates: result.coord};
      delete row._id;
      delete row.coord;
      
      col.insert(row, {safe: true}, function(err,items)
      {
        if (err)
        {
          return reportError(res, err);
        }

        res.send(201,items[0]);
      });
    }
    catch (e)
    {
      reportError(res,e);
    }
  });
}

function geoPut(cls,geoType)
{
  app.put("/"+cls+"/:id",function(req,res)
  {
    try 
    {
      var col = db.collection("geo");
      var id = new ObjectID(req.params.id);

      var row = req.body;
      var result = parseCoordFun[geoType](row.coord);
      
      if (result.coord)
      {
        row["geo.coordinates"] = result.coord;
      }
      
      delete row._id;
      delete row.type;
      delete row.coord;
    
      col.update({_id: id, class: cls},{$set: row}, function(err,cnt)
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
    }
    catch (e)
    {
      reportError(res,e);
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
  
  var y1 = r.coord[0][0];
  var x1 = r.coord[0][1];
  var y2 = r.coord[1][0];
  var x2 = r.coord[1][1];
  
  col.find({geo:
              { $geoIntersects :
                { $geometry :
                { type : "Polygon" ,
                        coordinates: [ [ [y1,x1] , [y1,x2] , [y2,x2] , [y2,x1], [y1,x1] ] ]
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

app.post("/user", function(req,res)
{
  var col = db.collection("users");
  
  var row = req.body;
  delete row._id;
  delete row.perm;
  
  if (!row.login || !row.passhash)
  {
    return sendError(res, 400, "No login or password hash");
  }
  
  row.perm = {}; // права по умолчанию
  
  col.insert(row, {safe: true}, function(err,items)
  {
    if (err)
    {
      return reportError(res, err);
    }

    delete items[0].passhash;
    delete items[0].perm;
    res.send(201,items[0]);
  });
});

app.get("/user/:id", function(req,res)
{
  var id = new ObjectID(req.params.id);
  var col = db.collection("users");
  
  col.findOne({_id: id},function(err,item)
  {
    if (err)
    {
      return reportError(res, err);
    }
    if (item)
    {
      delete item.passhash;
      delete item.perm;
      res.send(200,item);
    }
    else
    {
      reportNotFound(res);
    }
  });
});

app.delete("/user/:id", function(req,res)
{
  var id = new ObjectID(req.params.id);
  var col = db.collection("users");
  
  col.remove({_id: id},function(err,cnt)
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

app.put("/user/:id", function(req,res)
{
  var id = new ObjectID(req.params.id);
  
  var row = req.body;
  delete row._id;
  delete row.perm;
  
  var col = db.collection("users");
  col.update({_id: id},{$set: row}, function(err,cnt)
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

/////////////////////////////////////////////

app.post("/user/:id/perm", function(req,res)
{
  res.send(405);
});

app.delete("/user/:id/perm", function(req,res)
{
  res.send(405);
});

app.get("/user/:id/perm", function(req,res)
{
  var id = new ObjectID(req.params.id);
  var col = db.collection("users");
  
  col.findOne({_id: id}, function(err, item)
  {
    if (err)
    {
      return reportError(res,err);
    }
    
    if (item)
    {
      res.send(200, {perm: Object.keys(item.perm).join(",")});
    }
    else
    {
      reportNotFound(res);
    }
  });
});

app.put("/user/:id/perm", function(req,res)
{
  var id = new ObjectID(req.params.id);
  var col = db.collection("users");
  
  var perm = {};
  
  if (!req.body.perm)
  {
    return sendError(res, 400,"Variable 'perm' is missing");
  }
  
  req.body.perm.split(",").forEach(function(el)
  {
    perm[el] = 1;
  });
  
  col.update({_id: id}, {$set: {perm: perm}}, function(err, cnt)
  {
    if (err)
    {
      return reportError(res,err);
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

/////////////////////////////////////////////

function sendError(res,code,msg)
{
  res.send(code, {message: msg});
}

function reportError(res,err)
{
  sendError(res, 500, err.message);
}

function reportNotFound(res,err)
{
  sendError(res, 404, "Object is not found");
}

////////////////////////////

app.listen(app.get("port"));
console.log('Listening on port ' + app.get("port") + ' (env: ' + process.env.NODE_ENV+')');
