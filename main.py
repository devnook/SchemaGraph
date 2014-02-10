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


import parser

from google.appengine.api import users


import json
import robotparser

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


class FetchHandler(webapp2.RequestHandler):
    def get(self):
      response = {}
      url = self.request.get('url')
      rp = robotparser.RobotFileParser()
      # TODO(ewag): find right url!
      rp.set_url("http://www.google.com/robots.txt")
      rp.read()
      if not rp.can_fetch('Googlebot', url):
        response['errors'].append('Content not crawlable. Check robots.txt file for crawl permission.')

      (response['entities'],
       response['entities_with_operations'],
       response['warnings'],
       response['errors']) = parser.parse_document(url)

      self.response.out.write(json.dumps(response))

class ParseHandler(webapp2.RequestHandler):
    def post(self):
      response = {}
      (response['entities'],
       response['entities_with_operations'],
       response['warnings'],
       response['errors']) = parser.parse_string(self.request.body)
      self.response.out.write(json.dumps(response))


app = webapp2.WSGIApplication([
    webapp2.Route('/fetch', handler=FetchHandler, name='fetch'),
    webapp2.Route('/parse', handler=ParseHandler, name='parse'),
    webapp2.Route('/examples/<sample>', handler=SampleHandler, name='sample'),
    ('/', MainHandler),
], debug=True)
