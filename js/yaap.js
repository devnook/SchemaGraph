function appendPropertyValue(child, path, repeated, rangeIncludes) {
    // var index = child.parentNode.getElementsByClassName("value").length;

    var index = child.parentNode.children.length - 1;
    if (index > 0 && !repeated) {
  return;
    }

    var div = document.createElement("div");
    div.innerHTML = renderPropertyValue(path + (repeated ? "." + index : ""), rangeIncludes);
    child.parentNode.appendChild(div);
}

function renderPropertyValue(path, rangeIncludes) {
    var html = "";
    if (typeof rangeIncludes == "string") {
        html += "<input type='text' name='" + path + "'>";
    } else if (typeof rangeIncludes == "object") {
        html += renderSupportedClass(path + ".", rangeIncludes);
    } else {
    }
    return html;
}

function renderSupportedClass(path, obj) {
    var html = "";
    html += "<div class='supported-class'>";
    html += "@type: " + obj["subClassOf"] + "";
    html += "<div class='supported-property'>";
    var properties = obj["supportedProperty"] || [];

    for (var i = 0; i < properties.length; i++) {
  html += "<div class='name'>" + properties[i].name + "</div>";
  html += "<div class='value'>";

  console.log(properties[i].occurs);

  var repeated = properties[i].occurs && (
            properties[i].occurs == "One-or-Many" ||
    properties[i].occurs == "Zero-or-Many");
  var optional = properties[i].occurs && (
            properties[i].occurs == "One-or-Zero" ||
    properties[i].occurs == "Zero-or-Many");

  var propertyName = path + properties[i].name;

  //if (!properties[i].occurs || (
  //    properties[i].occurs == "One-or-Zero" ||
  //    properties[i].occurs == "Exactly-or-One")) {
        // TODO(goto): add a length counter.
  //} else
  if (repeated || optional) {
            var json = JSON.stringify(properties[i].rangeIncludes);
            html += "<span class='add' onclick='appendPropertyValue(this, \"" + (path + properties[i].name) + "\", " + (repeated) + ", " + (json) + ")'>+</span>";
  }

  if (!optional) {
            html += renderPropertyValue(
    propertyName + (repeated ? ".0" : ""), properties[i].rangeIncludes);
  }
  html += "</div>";
  html += "<div style='clear: both;'></div>";
    }
    html += "</div>";
    html += "</div>";
    return html;
}


Crawler = function() {
  goog.base(this);
};
goog.inherits(Crawler, goog.async.Deferred);

Crawler.prototype.fetch = function(url) {
  var request = new XMLHttpRequest();

  var d = this;

  request.onreadystatechange = function() {
    if (request.readyState == 4) {
      if (request.status == 200) {
        d.callback(request);
      } else {
        d.errback();
      }
    }
  }

  request.open("GET", url, true);
  request.responseType = "document";
  request.send();
};

function parseJsonLd(dom) {
  // console.log("Received from server:");
  // console.log(dom);
  // console.log("Looking for JSON-LD");
  // For simplicity, assume there is just one entry.
  var script = dom.getElementsByTagName("script")[0];
  // console.log("Found. Valid json type? " + (script.type == "application/ld+json"));
  // console.log(script.innerHTML);
  return JSON.parse(script.innerHTML);
}

function loading() {
  document.getElementById("action").className = "loading";
}

function loaded() {
  document.getElementById("action").className = "loaded";
}

function parseHtml(url, request) {
  var dom = request.responseXML;
  var links = dom.getElementsByTagName("*");
  var result = [];
  for (var p = 0; p < links.length; p++) {
    if (links[p].attributes.getNamedItem("itemscope")) {
      var itemid = links[p].attributes.getNamedItem("itemid").nodeValue;
      var absoluteUrl = itemid.substr(0, 3) == "http" ?
          itemid : url + itemid;
      result.push({
        src: absoluteUrl,
        innerHTML: links[p].innerHTML
      });
    }
  }
  return result;
}

function parseXml(url, request) {
  var dom = request.responseXML;
  var object = parseJsonLd(dom);
  // object["@id"] = url;
  return object;
}

function toAbsoluteUrl(baseUrl, obj) {
  var result = {};
  for (var prop in obj) {
    if (obj[prop] instanceof Array) {
      result[prop] = [];
      for (var i = 0; i < obj[prop].length; i++) {
    if (typeof obj[prop][i] == 'object') {
              result[prop].push(toAbsoluteUrl(baseUrl, obj[prop][i]));
    } else {
              result[prop].push(obj[prop][i]);
    }
      }
    } else if (typeof obj[prop] == 'object') {
      result[prop] = toAbsoluteUrl(baseUrl, obj[prop]);
    } else if (prop == "@id" && obj[prop].substr(0, 4) != "http") {
      var url = new goog.Uri(baseUrl);
      url.setPath(obj[prop]);
      result[prop] = url.toString();
    } else {
      result[prop] = obj[prop];
    }
  }
  return result;
}

function linkifyId(obj) {
  var result = {};
  for (var prop in obj) {
    if (obj[prop] instanceof Array) {
      result[prop] = [];
      for (var i = 0; i < obj[prop].length; i++) {
    if (typeof obj[prop][i] == 'object') {
              result[prop].push(linkifyId(obj[prop][i]));
    } else {
              result[prop].push(obj[prop][i]);
    }
      }
    } else if (typeof obj[prop] == 'object') {
      result[prop] = linkifyId(obj[prop]);
    } else if (prop == "@id") {
      result[prop] = "<a href='" + obj[prop] + "'>" + obj[prop] + "</a>";
    } else {
      result[prop] = obj[prop];
    }
  }
  return result;
}

function findObjectById(obj, id) {
  if (obj["@id"] == id) {
    return obj;
  }

  for (var prop in obj) {
    if (obj[prop] instanceof Array) {
      for (var i = 0; i < obj[prop].length; i++) {
        var result = findObjectById(obj[prop][i], id);
        if (result != null) {
          return result;
        }
      }
    } else if (typeof obj[prop] == 'object') {
      var result = findObjectById(obj[prop], id);
        if (result != null) {
          return result;
        }
    }
  }

  return null;
}


function renderJson(url, object) {
  console.log(object);
  //console.log(linkifyId(toAbsoluteUrl(url, object)));
  document.getElementById("log").innerHTML =
    JSON.stringify(linkifyId(toAbsoluteUrl(url, object)), undefined, 2);
}

function fetchService(url, callback) {
  loading();

  var crawler = new Crawler();

  crawler.addCallback(parseXml.bind(null, url));
  crawler.addCallback(function(object) {
    loaded();

    renderJson(url, object);

    callback(parseService(object));
  });

  crawler.fetch(url);

  return false;
}

function parseService(instance) {
  if (!instance.operation) {
    instance.operation = [];
  } else if (!(instance.operation instanceof Array)) {
    instance.operation = [instance.operation];
  }

  for (var p = 0; p < instance.operation.length; p++) {
    var operation = instance.operation[p];
    if (!operation.actionHandler) {
      operation.actionHandler = [];
    } else if (!(operation.actionHandler instanceof Array)) {
      operation.actionHandler = [operation.actionHandler];
    }
    for (var k = 0; k < operation.actionHandler.length; k++) {
      handler = operation.actionHandler[k];

      var args = handler.expects;

      var params = {};
      handler.params = params;

      for (var i in args) {
        // console.log(args[i].name);
        var path = args[i].name.split(".");
        var obj = operation;

        for (var ref in path) {
          // console.log(path[ref]);
          if (!obj[path[ref]]) {
            obj = "INPUT";
            break;
          }
          obj = obj[path[ref]];
          // console.log(obj);
        }

        if (obj) {
          params[args[i].name] = obj;
        } else {
          params[args[i].name] = "FORM!";
        }
      }
    }
  }


  return instance;
}

function renderService(instance, action) {

  // console.log(instance);
  // console.log(action);

  var html = "";
  html += "<div>";
  html += "  <div>";

  // html += "<span><b>{$service}</b> {$name}</span> {<br>";
  html += "&nbsp;&nbsp; id: {$id}<br>";

  html = html.replace("{$service}", instance["@type"]);
  html = html.replace("{$id}", instance["@id"]);
  html = html.replace("{$name}", instance.name);

  for (var p = 0; p < instance.operation.length; p++) {
    var operation = instance.operation[p];

    if (operation["@type"] != action) {
  continue;
    }

    for (var k = 0; k < operation.actionHandler.length; k++) {

      handler = operation.actionHandler[k];
      handler.expects = handler.expects || [];
      var args = handler.expects;
      var params = handler.params;

      html += "  <form id='invocation' method='{$httpMethod}' action='{$url}' handler='{$handler}' target='_blank'>";

      html += "    <input type='hidden' name='@type' value='" + operation["@type"] + "'>";
      html += "    <br><br>";
      html += "&nbsp;&nbsp;  // {$comments}";
      html += "  <br>";
      // html += "&nbsp;&nbsp;  <b>operation</b> {$returns} {$operation} (";

      for (var l = 0; l < handler.expects.length; l++) {
        var supportedClass = handler.expects[l];
        html += renderSupportedClass(supportedClass.name + ".", supportedClass);
      }

      /*
      for (var key in params) {
        html += "    <br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{$key} = ";
        html += "<input type='text' id='{$key}' {$disabled} value='{$value}'>,";
        html = html.replace(/{\$key}/g, key);
        html = html.replace("{$disabled}",
            params[key] != "INPUT" ? "disabled" :  "");
        if (typeof params[key] == "string") {
          html = html.replace(/{\$value}/g,
              params[key] != "INPUT" ? params[key] : "");
        } else {
          html = html.replace(/{\$value}/g,
              params[key] != "INPUT" ? "" : "");
        }
      }
      */

      // html += ");";
      html += "";
      // html += "  <input type='submit' id='execute' value='{$execute}' onclick='javascript: {$fn}()'></input>";
      html += "<br>";

      html = html.replace("{$comments}", handler.name);
      html = html.replace("{$operation}", operation["@type"]);
      // html = html.replace("{$url}", handler.url);
      html = html.replace("{$fn}", "fn" + operation["@type"]);
      html = html.replace("{$returns}", handler.returns ? handler.returns.subClassOf : 'Void');
      html = html.replace("{$url}", instance["@id"]);
      var httpMethod = handler.httpMethod || "GET";
      // if (handler["@type"] == "HttpHandler") {
      // httpMethod = "POST";
      //}
      html = html.replace("{$httpMethod}", httpMethod);
      html = html.replace("{$handler}", handler["@type"]);
      // alert(instance["@id"]);
      //console.log(html);

      /*
      switch (handler["@type"]) {
        case "HttpHandler":
          html = html.replace("{$execute}", "execute inline");
          break;
        case "WebParamsHandler":
          html = html.replace("{$execute}", "open webpage with params");
          break;
        case "WebPageHandler":
          html = html.replace("{$execute}", "open webpage");
          break;
      }

      window["fn" + operation["@type"]] = f.bind(
          undefined, instance["@id"], handler, params);

      */

      html += "  </form>";


    }

    html += "<br>";
    // html += "}";

    html += "  </div>";
    html += "</div>";
    // document.getElementById("service").innerHTML = html;

  }

  return html;
}

function f(url, handler, params) {
  loading();

  console.log("params:");
  console.log(params);

  for (var key in params) {
    if (params[key] == "INPUT") {
      params[key] = document.getElementById(key).value;
    }
  }

  // debugger;
  console.log("params values:");
  console.log(params);
  var payload = paramsToInstance(params);
  console.log(payload);
  payload = JSON.stringify(payload);
  console.log(payload);

  var httpMethod = handler.httpMethod || "GET";
  // console.log(instance);

  switch (handler["@type"]) {
    case "HttpHandler":
      var request = new XMLHttpRequest();
      request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
          var dom = request.responseXML;
          var object = parseJsonLd(dom);
          renderJson(url, object);
          loaded();
        }
      }

      request.open(httpMethod, url, true);
      request.setRequestHeader("Content-type", "application/json; charset=utf-8");

      request.responseType = "document";
      request.send(payload);
      break;

    case "WebParamsHandler":
      url += "?";
      for (var key in params) {
        url += "&";
        url += key;
        url += "=";
        url += params[key];
      }
      window.open(url, '_blank');
      loaded();
      return;
      break;

    case "WebPageHandler":

      console.log(url);

      var form = document.createElement("form");
      form.setAttribute("action", url);
      form.setAttribute("target", "_blank");
      form.setAttribute("method", httpMethod);
      document.body.appendChild(form);
      form.submit();

      loaded();
      return;
      break;
  }
}

function paramsToInstance(params) {
  var object = {};
  for (var key in params) {
    var path = key.split(".");
    var entry = object;
    console.log("Adding key: " + key);
    for (var i in path) {
      console.log(path[i]);
      if (i == (path.length - 1)) {
        console.log('hey! setting ' + params[key]);
        entry[path[i]] = params[key];
      } else {
        entry[path[i]] = {};
        entry = entry[path[i]];
      }
    }
    console.log(object);
  }
  return object;
}

