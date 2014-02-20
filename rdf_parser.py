
import rdflib

import validator

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
    logging.info(doc)
    g, parse_errors = process_dom(doc, url)



    entities, entities_with_operations, warnings, errors = process_graph(g)


    return entities, entities_with_operations, warnings, errors + parse_errors

def parse_string(docString):
  doc = html5lib.parse(docString, treebuilder="dom")
  g, parse_errors = process_dom(doc, None)
  entities, entities_with_operations, warnings, errors = process_graph(g)
  return entities, entities_with_operations, warnings, errors + parse_errors


def process_dom(doc, location):
  g = rdflib.Graph()
  errors = []
  for el in doc.getElementsByTagName("script"):
    print 'el'
    if el.getAttribute('type') == 'application/ld+json':

      if el.firstChild:
        #print el.firstChild.data.strip()
        try:
          g.parse(data=el.firstChild.data.strip(), location=location, format='json-ld')
        except ValueError as e:
          # log here
          errors.append(str(e))



  return g, errors


def main():

  json_ser = '{"@context": { "@vocab": "http://schema.org/" },"@type": "Restaurant","@id": "http://code.sgo.to/restaurants/123","name": "Sams Pizza Place","cuisine": "pizzeria","orders": {"@type": "ItemList","@id": "http://code.sgo.to/restaurants/123/orders"},"reservations": {"@type": "ItemList","@id": "http://code.sgo.to/restaurants/123/reservations"}}'

  json_res = '{"@type": "ItemList","@id": "http://code.sgo.to/restaurants/123/reservations","http://schema.org/operation": {"@type": "http://schema.org/SearchAction","http://schema.org/actionStatus": "http://schema.org/proposed","http://schema.org/actionHandler": [{"@type": "http://schema.org/HttpHandler","name": "object","httpMethod": "post"}]}}'


  obj = json.loads(json_ser)
  #print obj
  g1 = rdflib.ConjunctiveGraph()
  g1.parse(data=json_ser.strip(), format='json-ld')
  g1.parse(data=json_res.strip(), format='json-ld')

  for s, p, o in g1:
    print s, p, o
    #pass
    """
    print g1.value(predicate=rdflib.term.URIRef(u'http://schema.org/operation'), object=o)
    a = g1.value(predicate=rdflib.term.URIRef(u'http://schema.org/operation'), object=o)
    if a:
      g1.value(object=p)
    """
  for s in  g1.subjects(
    #rdflib.term.URIRef(u'http://code.sgo.to/restaurants/123'),
    predicate=rdflib.term.URIRef(u'http://schema.org/operation')):
    print s
    for s1 in g1.subjects(
      #rdflib.term.URIRef(u'http://code.sgo.to/restaurants/123'),
      object=rdflib.term.URIRef(s)):
      print  s, s1
      for s2 in g1.subjects(
        #rdflib.term.URIRef(u'http://code.sgo.to/restaurants/123'),
        object=rdflib.term.URIRef(s1)):
        print  s1, s2



  print(g1.serialize(format='json-ld', auto_compact=True, indent=4))



if __name__ == '__main__':
   main()


def process_graph(g):
  #warnings, errors = validator.validate(g)
  warnings = []
  errors = []

  if errors:
    entities_by_id = []
    entities_with_operations = []
  else:

    entities_with_operations = set()

    #for s,p,o in g:
      #logging.info('%s %s %s', s, p, o)
      #logging.info('%s %s %s', s, p, o)
      #pass
    context = {
      "@vocab": "http://schema.org/",
      "name": "http://schema.org/name",
      "menu": "http://schema.org/menu",
    }
    output = g.serialize(format='json-ld', auto_compact=True, context=context, indent=4)

    print len(g)
    print output


    context = {"@vocab": "http://schema.org/", "name": "http://schema.org/name"}
    output = g.serialize(format='json-ld', auto_compact=True, context=context, indent=4)

    print output

    obj = json.loads(output)
    entities_by_id = {}

    for entity in obj['@graph']:

      entities_by_id[entity['@id']] = entity

  return entities_by_id, list(entities_with_operations), warnings, errors







