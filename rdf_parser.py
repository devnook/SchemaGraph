
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



def parse_document(url):
  document = urlopen(url)
  logging.info(url)
  with closing(document) as f:
    doc = html5lib.parse(f, treebuilder="dom",
                         encoding=f.info().getparam("charset"))
    g, parse_errors = process_dom(doc, url)
    graph, entities, warnings, errors = process_graph(g, url)

    errors.update(parse_errors)

    return graph, entities, warnings, list(errors)

def parse_string(docString):
  doc = html5lib.parse(docString, treebuilder="dom")
  g, parse_errors = process_dom(doc, None)
  graph, entities, warnings, errors = process_graph(g)
  errors.update(parse_errors)

  return graph, entities, warnings, list(errors)


def process_dom(doc, location):
  g = rdflib.Graph()
  errors = []

  # This is a hack to force rewriting relative url to full urls.
  # TODO(ewag): Rethink whole issue of custom context resolution.
  context = {
    "@vocab": "http://schema.org/",
    "http://schema.org/url": {
      "@type": "@id"
    },
    "url": {
      "@type": "@id"
    }
  }
  if location:
    context["@base"] = location

  for el in doc.getElementsByTagName("script"):
    if el.getAttribute('type') == 'application/ld+json':

      if el.firstChild:
        #print el.firstChild.data.strip()
        try:
          doc_json = json.loads(el.firstChild.data.strip())
          # Force url rewrites
          expanded = jsonld.expand(jsonld.compact(doc_json, context))
          data = json.dumps(expanded)
          g.parse(data=data, base=location, format='json-ld')
        except ValueError as e:
          # log here
          errors.append(str(e))

  for el in doc.getElementsByTagName('body'):
    data = el.toxml()
    g.parse(data=data, format='microdata')

  for s, p, o in g:
    print s, p, o

  return g, errors

SUPPORTED_TYPES = [
  'http://schema.org/Restaurant',
  'http://schema.org/Movie'
]

def main():

  json_ser = '{"@context": { "@vocab": "http://schema.org/" },"@type": "Restaurant","@id": "http://code.sgo.to/restaurants/123","name": "Sams Pizza Place","cuisine": "pizzeria","orders": {"@type": "ItemList","@id": "http://code.sgo.to/restaurants/123/orders"},"reservations": {"@type": "ItemList","@id": "http://code.sgo.to/restaurants/123/reservations"}}'
  json_ser2 = '{"@context": { "@vocab": "http://schema.org/" },"@type": "Restaurant", "@id": "http://code.sgo.to/restaurants/1232","name": "Sams Pizza Place 2"}'

  json_res = '{"@type": "ItemList","@id": "http://code.sgo.to/restaurants/123/reservations","http://schema.org/operation": {"@type": "http://schema.org/SearchAction","http://schema.org/actionStatus": "http://schema.org/proposed","http://schema.org/actionHandler": [{"@type": "http://schema.org/HttpHandler","name": "object","httpMethod": "post"}]}}'
  json_res2 = '{"@type": "http://schema.org/Movie","@id": "http://code.sgo.to/movie/123","http://schema.org/operation": {"@type": "http://schema.org/SearchAction","http://schema.org/actionStatus": "http://schema.org/proposed","http://schema.org/actionHandler": [{"@type": "http://schema.org/HttpHandler","name": "object", "http://schema.org/url": "http://example.com", "httpMethod": "post"}]}}'


  obj = json.loads(json_ser)
  #print obj
  g1 = rdflib.ConjunctiveGraph()
  #g1.parse(data=json_ser.strip(), format='json-ld')
  #g1.parse(data=json_ser2.strip(), format='json-ld')
  #g1.parse(data=json_res.strip(), format='json-ld')
  g1.parse(data=json_res2.strip(), format='json-ld')

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


def process_graph(g, url=None):
  errors = validator.validate(g)
  warnings = []
  entities = []

  graph = g.serialize(format='json-ld', indent=4)
  doc = json.loads(graph)

  for supported_type in SUPPORTED_TYPES:
    frame = {
      "@type": supported_type
    }
    framed = jsonld.frame(doc, frame)

    entities.extend(framed['@graph'])

  pp = pprint.PrettyPrinter(indent=2)
  #pp.pprint(doc)


  return doc, entities, warnings, errors









