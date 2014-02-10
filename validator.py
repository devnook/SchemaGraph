import rdflib
from rdflib.plugins import sparql



rules = [
  (sparql.prepareQuery('SELECT ?s WHERE { ?s <http://schema.org/operation> ?o }'), 'error', 'No schema.org/operation properties found.'),
  (sparql.prepareQuery('SELECT ?s WHERE { ?s <http://schema.org/operatidfdon> ?o }'), 'warning', 'Test warning.')
]

def validate(g):
  warnings = []
  errors = []

  for rule in rules:
    qres = g.query(rule[0])
    if len(qres) < 1:
      message_list = errors if rule[1] == 'error' else warnings
      message_list.append(rule[2])

  return (warnings, errors)