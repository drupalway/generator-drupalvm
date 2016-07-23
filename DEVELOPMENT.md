# Plan

- [ ] Fix prompts:
	- [x] workflow option
	- [x] download vm + select version
	- [x] host ip by default 0.0.0.0 if detected vagrant-auto_network
	- easy switching os/php version
	- [x] add more version options for drush
	- ? add select or type prompt ?
	- [x] change name of the drupalvm folder
	
- [ ] Add templates per workflow
	Different workflows option leads to using a diffrent config templates.
	Workflows:
	- Drupal in code + install_profile/composer (opt) + db import (opt)
	- Empty project

# Updation yeoman
- npm update -g npm
- npm install -g yo

# Debuging
Some info http://kflu.github.io/2016/05/11/Debugging-Yeoman-generators.html
npm install -g node-inspector
node-inspector
node --debug=5859 /usr/local/lib/node_modules/yo/lib/cli.js drupalvm