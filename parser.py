
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


def parse_document(url):
  g = rdflib.Graph()
  with closing(urlopen(url)) as f:
    print f.getcode()
    doc = html5lib.parse(f, treebuilder="dom",
                         encoding=f.info().getparam("charset"))
    for el in doc.getElementsByTagName("script"):
      if el.getAttribute('type') == 'application/ld+json':
        if el.firstChild:
          g.parse(data=el.firstChild.data.strip(), format='json-ld')

    for s,p,o in g:
      print s,p,o

    output = g.serialize(format='json-ld', indent=4)
    entities = createEntitiesIndex(output)

    #print entities
    #print list(g)
    return entities





iteritems = lambda mapping: getattr(mapping, 'iteritems', mapping.items)()

def createEntitiesIndex(jsonString):
  obj = json.loads(jsonString)
  entities = {}
  for key, obj, parent in objwalk(obj, ''):
    #TODO(ewag): validate type.
    entities[parent['@id']] = parent
  return entities


def objwalk(obj, key, parent=None):
  if key == "http://schema.org/operation":
    yield key, obj, parent
  elif isinstance(obj, dict):
    for key, value in iteritems(obj):
      for key, item, parent in objwalk(value, key, obj):
        yield key, item, parent
  elif isinstance(obj, list):
    for index, value in enumerate(obj):
      for index, item, parent in objwalk(value, index, obj):
        yield index, item, parent
