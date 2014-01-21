#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import jinja2
import os
import webapp2
import logging
import datetime
from time import strftime, gmtime

import urllib2

import rdflib

from google.appengine.api import users
from google.appengine.api import mail
from google.appengine.api import channel


jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(['templates', 'templates/examples']),
    extensions=['jinja2.ext.autoescape'])


class MainHandler(webapp2.RequestHandler):

  def get(self):
    """Serves the homepage"""
    template = jinja_environment.get_template('index.html')
    logout_url = users.create_logout_url('/')
    user = users.get_current_user()
    #token = channel.create_channel(user.user_id())
    token = ''
    self.response.out.write(template.render(user=user.email(),
                                            token=token,
                                            logout_url=logout_url))

  def post(self):
    """Sends email with embedded structured data."""
    email = users.get_current_user().email()
    if not mail.is_email_valid(email):
      self.response.out.write('Invalid email.')
    else:
      subject = "Testing Gmail Actions " + datetime.datetime.today().strftime('%Y-%m-%d %H:%M')
      content = self.request.get('content')
      body = content
      mail.send_mail(email, email, subject, body='', html=body)
      self.response.out.write('The email was sent.')


class SampleHandler(webapp2.RequestHandler):
  def get(self, sample):
    """Returns the content of a sample email with embedded structured data.

    Args:
      sample: The type of the sample email to return.
    """
    google_now_date = self.request.get('googleNowDate')
    template = jinja_environment.get_template(sample + '.html')
    self.response.out.write(template.render())

  def post(self, sample):
    """Returns the content of a sample email with embedded structured data.

    Args:
      sample: The type of the sample email to return.
    """
    template = jinja_environment.get_template(sample + '.html')
    if template:
      self.response.out.write('success')
    else:
      self.error(404)
      self.response.out.write('failure')

from rdflib import Graph, plugin
from rdflib.serializer import Serializer
from rdflib.parser import Parser
plugin.register('json-ld', Serializer, 'rdflib_jsonld.serializer', 'JsonLDSerializer')
plugin.register('json-ld', Parser, 'rdflib_jsonld.parser', 'JsonLDParser')

#import rdfextras
#rdfextras.registerplugins() # if no setuptools

class FetchHandler(webapp2.RequestHandler):
    def get(self):
      """An example implementation of a Gmail action's handler url.

      In this example it is a static url, always returns status 400. It also notifies
      the UI via the channel service that this call was received.
      """
      url = self.request.get('url')
      #TODO(ewag): Validate url.



      g=rdflib.Graph()
      g.load(url, format="rdfa")

      #url = 'http://dbpedia.org/resource/Semantic_Web'
      #g.load(url, format="microdata")



      #test_json = g.serialize(format='json-ld', indent=4)

      test_json = """
      {
        "@context": {
          "name": "http://schema.org"
        },
        "@id": "Nfc1857e1e24c49ada75934412f0704f5",
        "@type": [
            "PostalAddress"
        ]
      }
      """



      g1 = rdflib.Graph().parse(data=test_json, format='json-ld')

      output = g1.serialize(format='json-ld', indent=4)

      print(output)

      #print g

      #for s,p,o in g:
      #  print s,p,o

      #print users.create_logout_url('/')

      self.response.out.write(output)





app = webapp2.WSGIApplication([
    webapp2.Route('/fetch', handler=FetchHandler, name='fetch'),
    webapp2.Route('/examples/<sample>', handler=SampleHandler, name='sample'),
    ('/', MainHandler),
], debug=True)
