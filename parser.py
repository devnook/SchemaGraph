
import rdflib

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
  g = rdflib.Graph()

  #print urllib.robotparser.can_fetch('Googlebot', url)
  print 'ha'
  test = urllib.robotparser.can_fetch('Googlebot', url)
  print test

  if test:
    print 'yes'
  else:
    print 'no'

  document = urlopen(url)
  print document

  with closing(document) as f:


    doc = html5lib.parse(f, treebuilder="dom",
                         encoding=f.info().getparam("charset"))
    for el in doc.getElementsByTagName("script"):
      if el.getAttribute('type') == 'application/ld+json':
        if el.firstChild:
          #print el.firstChild.data.strip()
          g.parse(data=el.firstChild.data.strip(), location=url, format='json-ld')


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

    return entities_by_id, list(entities_with_operations)






