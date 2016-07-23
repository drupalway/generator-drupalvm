'use strict';

var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var mkdirp = require('mkdirp');
var nodefs = require('fs');
var shelljs = require('shelljs');

var DrupalVMGenerator = yeoman.generators.Base.extend({
  /**
   * Get VM destination path.
   */
  _getVmDest: function () {
    return this.destinationRoot() + '/vm';
  },
  /**
   * Checks if "auto_network" plugin exists.
     */
  _isAutoNetwork: function() {
    var cmd = 'vagrant plugin list | grep auto_network';
    return !!shelljs.exec(cmd)['output'];
  },
  prompting: function () {
    var done = this.async();

    this._buildNiceHeader();

    var prompts = [
      {
        type: 'list',
        name: 'workflow',
        message: 'Specify your workflow type:',
        choices: [
          'new',
          'exist'
        ],
        default: 'new'
      },
      {
        type: 'list',
        name: 'drupalvm_version',
        message: 'Specify what version of DrupalVM you want to use:',
        choices: ['master', '3.1.4'],
        default: '3.1.4'
      },
      {
        type: 'confirm',
        name: 'install_drupal',
        message: 'Do you need to install Drupal? If not, you should provide your own instance of Drupal at ' + this.destinationRoot() + '/docroot',
        default: 'Y',
        when: function(props) {
          return props.workflow == 'new';
        }.bind(this)
      },
      {
        type: 'list',
        name: 'drupal_version',
        message: 'What version of Drupal do you want to install?',
        choices: ['7', '8'],
        default: '7',
        when: function(props) {
          return props.install_drupal;
        }.bind(this)
      },
      {
        type: 'input',
        name: 'vagrant_hostname',
        message: 'Enter a hostname for the VM. No spaces or symbols. Vagrant will automatically append your hostfile for you.',
        default: 'drupalvm.dev'
      },
      {
        type: 'input',
        name: 'vagrant_machine_name',
        message: 'Enter a machine name for the VM. No spaces or symbols.',
        default: function(props) { return props.vagrant_hostname }.bind(this)
      },
      {
        type: 'input',
        name: 'vagrant_ip',
        message: 'What IP do you want to use for the VM?',
        default: this._isAutoNetwork() ? '0.0.0.0' : '192.168.88.88'
      },
      {
        type: 'list',
        name: 'sync_type',
        message: 'Select the method of file sync you want.',
        choices: ['nfs', 'rsync', 'smb'],
        default: 'nfs'
      },
      {
        type: 'input',
        name: 'vagrant_memory',
        message: 'How much memory (in MB) do you want to allot to this virtual machine?',
        default: '2048'
      },
      {
        type: 'input',
        name: 'vagrant_cpus',
        message: 'How many CPUs for this virtual machine?',
        validate: function(input) {
          return (!isNaN(input) && (input < 5) && (input >= 1));
        },
        default: '2'
      },
      {
        type: 'list',
        name: 'drupalvm_webserver',
        message: 'Do you want to use Apache or Nginx?',
        choices: ['apache', 'nginx'],
        default: 'nginx'
      },
      {
        type: 'list',
        name: 'drush_version',
        message: 'Which Drush version do you want to use?',
        choices: ['8.1.3', '7.3.0', '6.7.0', '5.11.0', 'master'],
        default: '8.1.3'
      },
      {
        type: 'checkbox',
        message: 'Which packages would you like to install?',
        name: 'packages',
        choices: [
          {name: 'adminer',   checked: true},
          {name: 'mailhog',   checked: true},
          {name: 'memcached', checked: false},
          {name: 'nodejs',    checked: false},
          {name: 'pimpmylog', checked: false},
          {name: 'ruby',      checked: false},
          {name: 'selenium',  checked: false},
          {name: 'solr',      checked: false},
          {name: 'varnish',   checked: false},
          {name: 'xdebug',    checked: false},
          {name: 'xhprof',    checked: false}
        ]
      },
      {
        type: 'list',
        name: 'php_version',
        message: 'What version of PHP do you want to use?',
        choices: ['5.5', '5.6', '7.0'],
        default: '7.0'
      },
      {
        type: 'input',
        name: 'php_memory_limit',
        message: 'How much memory do you want to allocated to PHP?',
        validate: function(input) {
          return (!isNaN(input) && (input >= 128));
        },
        default: '256'
      },
      {
        type: 'input',
        name: 'solr_version',
        message: 'What version of Solr do you want to install?',
        default: '4.10.4',
        when: function(props) {
          return this._contains(props.packages, 'solr');
        }.bind(this)
      }
    ];

    this.prompt(prompts, function (props) {
      this.props = props; done();
    }.bind(this));
  },

  initializing: function() {},

  configuring: function() {
    mkdirp.sync(this._getVmDest());
  },

  /**
   * Clone the DrupalVM repo with a specified version.
   */
  _cloneDrupalVm: function () {
    var version = this.props.drupalvm_version;
    console.log('💥 Cloning the DrupalVM version "' + version + '"...');
    var cmd = version && version != 'master'
        ? 'git clone --branch ' + version + ' https://github.com/geerlingguy/drupal-vm.git '
        : 'git clone https://github.com/geerlingguy/drupal-vm.git ';
    cmd += this._getVmDest();
    if (shelljs.exec(cmd, {silent: true}).code !== 0) {
      console.log('Error: Git clone DrupalVM failed');
      shelljs.exit(1);
    }
  },

  writing: function() {
    this._cloneDrupalVm();
    this.fs.copyTpl(
      this.templatePath('configuration'),
      this.destinationPath(this._getVmDest()),
      {
        workflow            : this.props.workflow,
        drupalvm_version    : this.props.drupalvm_version,
        install_drupal      : this.props.install_drupal,
        drupal_version      : this.props.drupal_version,
        drupal_core_branch  : this.props.drupal_version == 7 ? '7.x' : '8.1.x',
        vagrant_hostname    : this.props.vagrant_hostname,
        vagrant_machine_name: this.props.vagrant_machine_name,
        vagrant_ip          : this.props.vagrant_ip,
        sync_type           : this.props.sync_type,
        vagrant_memory      : this.props.vagrant_memory,
        vagrant_cpus        : this.props.vagrant_cpus,
        drupalvm_webserver  : this.props.drupalvm_webserver,
        drush_version       : this.props.drush_version,
        packages            : this.props.packages,
        php_version         : this.props.php_version,
        php_memory_limit    : this.props.php_memory_limit,
        solr_version        : this._contains(this.props.packages, 'solr')       ? this.props.solr_version : '4.10.4',
        enable_xdebug       : this._contains(this.props.packages, 'xdebug')     ? 1             : 0,
        install_adminer     : this._contains(this.props.packages, 'adminer')    ? '- adminer'   : '#- adminer',
        install_mailhog     : this._contains(this.props.packages, 'mailhog')    ? '- mailhog'   : '#- mailhog',
        install_memcached   : this._contains(this.props.packages, 'memcached')  ? '- memcached' : '#- memcached',
        install_nodejs      : this._contains(this.props.packages, 'nodejs')     ? '- nodejs'    : '#- nodejs',
        install_pimpmylog   : this._contains(this.props.packages, 'pimpmylog')  ? '- pimpmylog' : '#- pimpmylog',
        install_ruby        : this._contains(this.props.packages, 'ruby')       ? '- ruby'      : '#- ruby',
        install_selenium    : this._contains(this.props.packages, 'selenium')   ? '- selenium'  : '#- selenium',
        install_solr        : this._contains(this.props.packages, 'solr')       ? '- solr'      : '#- solr',
        install_varnish     : this._contains(this.props.packages, 'varnish')    ? '- varnish'   : '#- varnish',
        install_xdebug      : this._contains(this.props.packages, 'xdebug')     ? '- xdebug'    : '#- xdebug',
        install_xhprof      : this._contains(this.props.packages, 'xhprof')     ? '- xhprof'    : '#- xhprof'
      }
    );
    this._addGitIgnoreEntries();
  },

  install: function() {},

  end: function() {
    var destination = this._getVmDest();
    console.log("\n" + chalk.green("Complete!"));
    console.log("\nNext steps:\n   -- Navigate to " + chalk.yellow(destination) + " and run the " + chalk.magenta("vagrant up") + " command.");
    console.log("   -- Read the README at " + destination + '/README.md or online at http://docs.drupalvm.com/en/latest');
  },

  /**
   * Check if array contains a value.
   */
  _contains: function(array, match) {
    var length = array.length;
    for (var i = 0; i < length; i++) {
      if (array[i] === match) return true;
    }
    return false;
  },

  /**
   * Create or append to the root level .gitignore file.
   *
   * Exclude .vagrant and .idea (PHPStorm project config).
   */
  _addGitIgnoreEntries: function () {
    var file    = this.destinationRoot() + '/.gitignore';
    var entries = '\n.vagrant\n.idea\nnode_modules';
    nodefs.appendFile(file, entries, function (error) {
      if (error) console.log(error);
    });
  },

  /**
   * Print a nice Generator header.
   */
  _buildNiceHeader: function () {
    console.log("\n\n");
    console.log(chalk.green("   _____                         ___      ____  __    _____                           _            "));
    console.log(chalk.green("  |  __ \\                       | \\ \\    / /  \\/  |  / ____|                         | |            "));
    console.log(chalk.green("  | |  | |_ __ _   _ _ __   __ _| |\\ \\  / /| \\  / | | |  __  ___ _ __   ___ _ __ __ _| |_ ___  _ __ "));
    console.log(chalk.green("  | |  | | '__| | | | '_ \\ / _` | | \\ \\/ / | |\\/| | | | |_ |/ _ \\ '_ \\ / _ \\ '__/ _` | __/ _ \\| \\'__|"));
    console.log(chalk.green("  | |__| | |  | |_| | |_) | (_| | |  \\  /  | |  | | | |__| |  __/ | | |  __/ | | (_| | || (_) | |"));
    console.log(chalk.green("  |_____/|_|   \\__,_| .__/ \\__,_|_|   \\/   |_|  |_|  \\_____|\\___|_| |_|\\___|_|  \\__,_|\\__\\___/|_|"));
    console.log(chalk.green("                    | |"));
    console.log(chalk.green("                    |_|"));

    console.log("\n\n     Generator created by " + chalk.cyan("@kevinquillen") + " of " + chalk.green("Velir") + ".\n     Repo: https://github.com/kevinquillen/generator-drupalvm");
    console.log("\n     This is a tool helps you kickstart a new Drupal project with the DrupalVM.");
    console.log("\n     DrupalVM is by " + chalk.yellow("@geerlingguy") + "\n     http://drupalvm.com");

    console.log("\n     Suggested Vagrant plugins:");
    console.log("       - " + chalk.red("vagrant-cachier") + " (https://github.com/fgrehm/vagrant-cachier)");
    console.log("       - " + chalk.red("vagrant-hostsupdater") + "  (https://github.com/cogitatio/vagrant-hostsupdater)");
    console.log("       - " + chalk.red("vagrant-auto_network") + "  (https://github.com/oscar-stack/vagrant-auto_network\n\n");
  }
});
module.exports = DrupalVMGenerator;
