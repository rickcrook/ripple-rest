# Ripple-REST on OpenShift #

## Overview ##

The Ripple-REST API provides a simplified, easy-to-use interface to the Ripple Network via a RESTful API. This page explains how to use the API to send and receive payments on Ripple.

This fork makes changes to allow deployment to OpenShift.
See upstream project for more information on Ripple-REST specifically.

### Quick Start ###

I assume you have OpenShift setup correctly and have already tested by following Openshift documentation on creating a node.js app - https://developers.openshift.com/en/node-js-overview.html

Follow these instructions to get your `ripple-rest` server running on OpenShift

1. run 'rhc app-create ripplerest nodejs-0.10 --from-code https://github.com/rickcrook/ripple-rest.git'
2. Visit your apps URL

