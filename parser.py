
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

class Error(Exception):
  pass

class FetchError(Error):
  """Base Error class for FracIntent object."""

import pdb

#import urllib
#import urllib.robotparser

def parse_document(url):
  document = urlopen(url)

  print url



  with closing(document) as f:
    doc = html5lib.parse(f, treebuilder="dom",
                         encoding=f.info().getparam("charset"))
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
    if el.getAttribute('type') == 'application/ld+json':
      if el.firstChild:
        #print el.firstChild.data.strip()
        try:
          g.parse(data=el.firstChild.data.strip(), location=location, format='json-ld')
        except ValueError as e:
          # log here
          errors.append(str(e))

  return g, errors


def process_graph(g):

  warnings, errors = validator.validate(g)

  if errors:
    entities_by_id = []
    entities_with_operations = []
  else:

    entities_with_operations = set()
    for s, p, o in g:
      if p == rdflib.term.URIRef(u'http://schema.org/operation'):
        entities_with_operations.add(str(s))


    context = {"@vocab": "http://schema.org/"}
    output = g.serialize(format='json-ld', context=context, indent=4)

    #print output


    obj = json.loads(output)
    entities_by_id = {}

    for entity in obj['@graph']:

      entities_by_id[entity['@id']] = entity

  return entities_by_id, list(entities_with_operations), warnings, errors







