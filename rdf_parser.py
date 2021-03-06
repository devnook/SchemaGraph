
import rdflib

import validator

import jsonld

from rdflib import Graph, plugin
from rdflib.serializer import Serializer
from rdflib.parser import Parser
plugin.register('json-ld', Serializer, 'rdflib_jsonld.serializer', 'JsonLDSerializer')
plugin.register('json-ld', Parser, 'rdflib_jsonld.parser', 'JsonLDParser')

#import rdfextras
#rdfextras.registerplugins() # if no setuptools

from contextlib import closing

from urllib2 import urlopen
import html5lib
import json

import logging
import re


context = {
  "@vocab": "http://schema.org/",
  "http://schema.org/url": {
    "@type": "@id"
  },
  "url": {
    "@type": "@id"
  }
}

def parse_document(document):

  with closing(document) as f:
    g = rdflib.Graph()
    errors = []
    # This is a hack to force rewriting relative url to full urls.
    # TODO(ewag): Rethink whole issue of custom context resolution.

    if document.headers.typeheader.split(';')[0] == 'application/json':
      g, errors = process_jsonld(g, f.read(), context, document.url)
    else:
      g.parse(data=f.read(), format='microdata')


    graph = json.loads(g.serialize(format='json-ld', indent=4))
    return graph, list(errors)


def parse_string(docString):
  g = rdflib.Graph()
  errors = []
  g.parse(data=docString, format='microdata')

  graph = json.loads(g.serialize(format='json-ld', indent=4))
  return graph, list(errors)


def process_dom(g, doc, context, location):
  errors = []
  for el in doc.getElementsByTagName("script"):
    if el.getAttribute('type') == 'application/ld+json':
      if el.firstChild:
        #print el.firstChild.data.strip()
        g, errors = process_jsonld(g, el.firstChild.data.strip(), context, location)

  for el in doc.getElementsByTagName('body'):
    data = el.toxml()
    g.parse(data=data, format='microdata')
  return g, errors


def process_jsonld(g, json_str, context, location):
  errors = []

  if location:
    context["@base"] = location

  try:
    doc_json = json.loads(json_str)
    # Force url rewrites
    expanded = jsonld.expand(jsonld.compact(doc_json, context))
    data = json.dumps(expanded)
    g.parse(data=data, base=location, format='json-ld')
  except ValueError as e:
    # log here
    errors.append(str(e))

  return g, errors


SUPPORTED_TYPES = [
  'http://schema.org/Restaurant',
  'http://schema.org/Movie',
  'http://schema.org/FoodEstablishmentReservation',
]

def main():

  json_ser = '''{
    "@context": {
      "@vocab": "http://schema.org/"
    },
    "@type": "Restaurant",
    "@id": "http://code.sgo.to/restaurants/123",
    "name": "Sams Pizza Place",
    "cuisine": "pizzeria",
    "orders": {
      "@type": "ItemList","@id": "http://code.sgo.to/restaurants/123/orders"
    },
    "reservations": {
      "@type": "ItemList",
      "@id": "http://code.sgo.to/restaurants/123/reservations"
    }}'''
  json_ser2 = '{"@context": { "@vocab": "http://schema.org/" },"@type": "Restaurant", "@id": "http://code.sgo.to/restaurants/1232","name": "Sams Pizza Place 2"}'

  json_res = '''{
    "@type": "ItemList",
    "@id": "http://code.sgo.to/restaurants/123/reservations",
    "http://schema.org/operation": {
      "@type": "http://schema.org/SearchAction",
      "http://schema.org/actionStatus": "http://schema.org/proposed",
      "http://schema.org/actionHandler": [{
        "@type": "http://schema.org/HttpHandler",
        "url": "http://somehandler.com",
        "name": "object",
        "httpMethod": "post"
      }]
    }
  }'''
  json_res2 = '{"@type": "http://schema.org/Movie","@id": "http://code.sgo.to/movie/123","http://schema.org/operation": {"@type": "http://schema.org/SearchAction","http://schema.org/actionStatus": "http://schema.org/proposed","http://schema.org/actionHandler": [{"@type": "http://schema.org/HttpHandler","name": "object", "http://schema.org/url": "http://example.com", "httpMethod": "post"}]}}'


  obj = json.loads(json_ser)
  #print obj
  g1 = rdflib.ConjunctiveGraph()
  g1.parse(data=json_ser.strip(), format='json-ld')
  #g1.parse(data=json_ser2.strip(), format='json-ld')
  g1.parse(data=json_res.strip(), format='json-ld')
  #g1.parse(data=json_res2.strip(), format='json-ld')

  for s, p, o in g1:
    print s, p, o
    #pass

  validator.runquery(g1)

  doc = """
    <span itemscope itemtype="http://schema.org/Restaurant" itemid="http://www.urbanspoon.com/r/1/5609/restaurant/Ballard/Rays-Boathouse-Seattle">
    <span itemprop="operation" itemscope itemtype="http://schema.org/ViewAction">
      <span itemprop="actionHandler" itemscope itemtype="http://schema.org/WindowsActionHandler">
        <meta itemprop="application" content="msApplication://78901">
        <meta itemprop="minVersion" content="2.2.0.12">
      </span>
    </span>
  </span>"""
  g2 = rdflib.Graph()
  g2.parse(data=doc.strip(), format='microdata')


import pprint

if __name__ == '__main__':
   main()










